process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert');
const { v4: uuidv4 } = require('uuid');
const {
  initDb,
  getPool,
  isPostgresConnected,
  saveTelegramNotification,
  getTelegramNotificationByRequestAndDonor,
  getDonorByTelegramChatId,
  localStore
} = require('../src/db/db');
const {
  handleTelegramCallbackQuery,
  mockSentMessages
} = require('../src/services/telegramService');

test('E2E Telegram Callback: Full Lifecycle (Accept, Decline, Duplicate, Unauthorized, DB Persistence)', async () => {
  await initDb();
  const pool = getPool();
  assert.ok(isPostgresConnected(), 'PostgreSQL must be connected');

  // 1. Setup a test requester, blood request, and donor in PostgreSQL
  const requesterId = uuidv4();
  const requestId = uuidv4();
  const donorId = uuidv4();
  const telegramChatId = 9876543210;

  // Insert requester user
  await pool.query(
    `INSERT INTO public.users (id, name, email, password_hash, role, is_verified)
     VALUES ($1, 'Test Requester E2E', $2, 'hash', 'requester', true)
     ON CONFLICT (id) DO NOTHING`,
    [requesterId, `requester_e2e_${Date.now()}@bloodbridge.org`]
  );

  // Insert active blood request
  await pool.query(
    `INSERT INTO public.blood_requests 
     (id, requester_id, patient_name, blood_group, units_needed, urgency, hospital_name, city, status, created_at, updated_at)
     VALUES ($1, $2, 'Aarav Patient', 'B+', 2, 'urgent', 'Max Hospital', 'Ghaziabad', 'active', NOW(), NOW())`,
    [requestId, requesterId]
  );

  // Insert donor with linked Telegram
  await pool.query(
    `INSERT INTO public.donors
     (id, name, email, blood_group, phone, city, telegram_chat_id, telegram_opt_in, availability_status, consent_to_contact, consent_status, verification_status, created_at, updated_at)
     VALUES ($1, 'Vikas Donor', $2, 'B+', '+91 99887 76655', 'Ghaziabad', $3, true, 'available', true, 'consented', 'verified', NOW(), NOW())`,
    [donorId, `donor_e2e_${Date.now()}@bloodbridge.org`, telegramChatId]
  );

  // 2. Dispatch pending notification
  const savedNotif = await saveTelegramNotification({
    request_id: requestId,
    donor_id: donorId,
    telegram_chat_id: telegramChatId,
    message_text: 'Emergency Blood Request for B+',
    status: 'sent'
  });
  assert.ok(savedNotif);

  // Verify pending status in DB
  const notifBefore = await getTelegramNotificationByRequestAndDonor(requestId, donorId);
  assert.strictEqual(notifBefore.status, 'sent');
  assert.strictEqual(notifBefore.donor_response, null);

  // 3. Process ACCEPT Callback Query
  mockSentMessages.length = 0;
  await handleTelegramCallbackQuery({
    id: 'cb_accept_e2e_1',
    from: { id: telegramChatId, first_name: 'Vikas' },
    message: {
      message_id: 1001,
      chat: { id: telegramChatId },
      text: 'Emergency Blood Request for B+'
    },
    data: `donor_accept:${requestId}`
  });

  // Check answerCallbackQuery was called
  const acceptAnswer = mockSentMessages.find((m) => m.method === 'answerCallbackQuery');
  assert.ok(acceptAnswer);
  assert.ok(acceptAnswer.payload.text.includes('accepted this blood donation contact request'));

  // Verify DB persistence of ACCEPTED
  const notifAfterAccept = await getTelegramNotificationByRequestAndDonor(requestId, donorId);
  assert.strictEqual(notifAfterAccept.status, 'accepted');
  assert.strictEqual(notifAfterAccept.donor_response, 'accepted');
  assert.ok(notifAfterAccept.responded_at !== null);

  // Verify blood request status transitioned to 'responses_received'
  const brRes = await pool.query('SELECT status FROM public.blood_requests WHERE id = $1', [requestId]);
  assert.strictEqual(brRes.rows[0].status, 'responses_received');

  // 4. Duplicate Click (Should acknowledge without state flipping)
  mockSentMessages.length = 0;
  await handleTelegramCallbackQuery({
    id: 'cb_accept_e2e_dup',
    from: { id: telegramChatId, first_name: 'Vikas' },
    message: {
      message_id: 1001,
      chat: { id: telegramChatId },
      text: 'Emergency Blood Request for B+'
    },
    data: `donor_accept:${requestId}`
  });

  const dupAnswer = mockSentMessages.find((m) => m.method === 'answerCallbackQuery');
  assert.ok(dupAnswer);
  assert.ok(dupAnswer.payload.text.includes('already ACCEPTED'));

  // 5. Test DECLINE on a second request
  const req2Id = uuidv4();
  await pool.query(
    `INSERT INTO public.blood_requests 
     (id, requester_id, patient_name, blood_group, units_needed, urgency, hospital_name, city, status, created_at, updated_at)
     VALUES ($1, $2, 'Neha Patient', 'B+', 1, 'urgent', 'Apollo Clinic', 'Ghaziabad', 'active', NOW(), NOW())`,
    [req2Id, requesterId]
  );

  await saveTelegramNotification({
    request_id: req2Id,
    donor_id: donorId,
    telegram_chat_id: telegramChatId,
    message_text: 'Emergency Blood Request 2 for B+',
    status: 'sent'
  });

  mockSentMessages.length = 0;
  await handleTelegramCallbackQuery({
    id: 'cb_decline_e2e_1',
    from: { id: telegramChatId, first_name: 'Vikas' },
    message: {
      message_id: 1002,
      chat: { id: telegramChatId },
      text: 'Emergency Blood Request 2 for B+'
    },
    data: `donor_decline:${req2Id}`
  });

  const declineAnswer = mockSentMessages.find((m) => m.method === 'answerCallbackQuery');
  assert.ok(declineAnswer);
  assert.ok(declineAnswer.payload.text.includes('declined this contact request'));

  // Verify DB persistence of DECLINED
  const notifAfterDecline = await getTelegramNotificationByRequestAndDonor(req2Id, donorId);
  assert.strictEqual(notifAfterDecline.status, 'declined');
  assert.strictEqual(notifAfterDecline.donor_response, 'declined');
  assert.ok(notifAfterDecline.responded_at !== null);

  // 6. Unauthorized Telegram User Rejection
  mockSentMessages.length = 0;
  await handleTelegramCallbackQuery({
    id: 'cb_unauth_1',
    from: { id: 1122334455, first_name: 'Stranger' },
    message: {
      message_id: 1003,
      chat: { id: 1122334455 },
      text: 'Emergency Blood Request'
    },
    data: `donor_accept:${requestId}`
  });

  const unauthAnswer = mockSentMessages.find((m) => m.method === 'answerCallbackQuery');
  assert.ok(unauthAnswer);
  assert.ok(unauthAnswer.payload.text.includes('Donor account not found'));

  // 7. Expired/Concluded Request Rejection
  await pool.query("UPDATE public.blood_requests SET status = 'cancelled' WHERE id = $1", [req2Id]);
  mockSentMessages.length = 0;
  await handleTelegramCallbackQuery({
    id: 'cb_expired_1',
    from: { id: telegramChatId, first_name: 'Vikas' },
    message: {
      message_id: 1002,
      chat: { id: telegramChatId },
      text: 'Emergency Blood Request 2'
    },
    data: `donor_accept:${req2Id}`
  });

  const expiredAnswer = mockSentMessages.find((m) => m.method === 'answerCallbackQuery');
  assert.ok(expiredAnswer);
  assert.ok(expiredAnswer.payload.text.includes('no longer active'));

  // Clean up test records
  await pool.query('DELETE FROM public.telegram_notifications WHERE request_id IN ($1, $2)', [requestId, req2Id]);
  await pool.query('DELETE FROM public.blood_requests WHERE id IN ($1, $2)', [requestId, req2Id]);
  await pool.query('DELETE FROM public.donors WHERE id = $1', [donorId]);
  await pool.query('DELETE FROM public.users WHERE id = $1', [requesterId]);
});
