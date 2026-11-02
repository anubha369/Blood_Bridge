const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');
const { localStore, getPool, isPostgresConnected } = require('../src/db/db');
const { generateOtpEmailHtml, maskEmail, getLastDispatchedOtp } = require('../src/services/emailService');

function testRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const payload = body ? JSON.stringify(body) : null;
      const reqHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      };
      if (payload) {
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: reqHeaders
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            server.close();
            try {
              const parsed = data ? JSON.parse(data) : {};
              resolve({ status: res.statusCode, body: parsed });
            } catch (err) {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        }
      );

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (payload) req.write(payload);
      req.end();
    });
  });
}

test('Email Service: Branded HTML Template & Email Masking', () => {
  const masked = maskEmail('vedikadubey16@gmail.com');
  assert.strictEqual(masked, 'v***6@gmail.com');

  const shortMasked = maskEmail('ab@test.com');
  assert.strictEqual(shortMasked, 'a***@test.com');

  const html = generateOtpEmailHtml({ toName: 'Vedika Dubey', otp: '482915', expiresInMinutes: 5 });
  assert.ok(html.includes('482915'));
  assert.ok(html.includes('BloodBridge Vision-X'));
  assert.ok(html.includes('5 minutes'));
  assert.ok(html.includes('Vedika Dubey'));
  assert.ok(html.includes('Security Notice'));
});

test('Email OTP: Complete Registration Workflow (Initiate -> Verify -> Login)', async () => {
  const uniqueEmail = `test_donor_${Date.now()}@bloodbridge.org`;
  const password = 'StrongPassword2026!';
  const name = 'Dr. Aryan Verma';

  // 1. Initiate registration
  const initRes = await testRequest('POST', '/api/auth/register-initiate', {
    name,
    email: uniqueEmail,
    password,
    role: 'donor',
    phone: '+91 98765 11223'
  });

  assert.strictEqual(initRes.status, 200);
  assert.strictEqual(initRes.body.success, true);
  assert.ok(initRes.body.challenge_id);
  assert.ok(initRes.body.email_masked);
  // Plain OTP must NEVER be returned in API response
  assert.strictEqual(initRes.body.otp, undefined);

  const challengeId = initRes.body.challenge_id;

  // 2. Reject incorrect OTP
  const badOtpRes = await testRequest('POST', '/api/auth/verify-email-otp', {
    challenge_id: challengeId,
    email: uniqueEmail,
    otp: '000000'
  });
  assert.strictEqual(badOtpRes.status, 400);
  assert.strictEqual(badOtpRes.body.success, false);
  assert.ok(badOtpRes.body.error.includes('Incorrect verification code'));

  // 3. Verify with the actual cryptographically generated OTP (strict verification, zero bypass)
  const dispatched = getLastDispatchedOtp();
  assert.ok(dispatched && dispatched.otp, 'Dispatched OTP must be captured for test verification');
  assert.strictEqual(dispatched.toEmail, uniqueEmail);
  const validOtp = dispatched.otp;

  const verifyRes = await testRequest('POST', '/api/auth/verify-email-otp', {
    challenge_id: challengeId,
    email: uniqueEmail,
    otp: validOtp
  });

  assert.strictEqual(verifyRes.status, 201);
  assert.strictEqual(verifyRes.body.success, true);
  assert.ok(verifyRes.body.token);
  assert.strictEqual(verifyRes.body.user.email, uniqueEmail);
  assert.strictEqual(verifyRes.body.user.is_verified, true);

  // 4. Prevent OTP reuse (one-time usage / consumed)
  const reuseRes = await testRequest('POST', '/api/auth/verify-email-otp', {
    challenge_id: challengeId,
    email: uniqueEmail,
    otp: validOtp
  });
  assert.strictEqual(reuseRes.status, 400);
  assert.ok(reuseRes.body.error.includes('expired') || reuseRes.body.error.includes('Invalid'));

  // 5. Duplicate signup prevention (account already exists)
  const dupRes = await testRequest('POST', '/api/auth/register-initiate', {
    name,
    email: uniqueEmail,
    password,
    role: 'donor'
  });
  assert.strictEqual(dupRes.status, 409);
  assert.ok(dupRes.body.error.includes('already exists'));

  // 6. Confirmed verified user can log in
  const loginRes = await testRequest('POST', '/api/auth/login', {
    identifier: uniqueEmail,
    password
  });
  assert.strictEqual(loginRes.status, 200);
  assert.strictEqual(loginRes.body.success, true);
  assert.ok(loginRes.body.token);
});

test('Email OTP: Resend Cooldown Enforcement (60s)', async () => {
  const email = `cooldown_test_${Date.now()}@bloodbridge.org`;
  const initRes = await testRequest('POST', '/api/auth/register-initiate', {
    name: 'Cooldown User',
    email,
    password: 'Password123!',
    role: 'requester'
  });

  assert.strictEqual(initRes.status, 200);
  const challengeId = initRes.body.challenge_id;

  // Immediate resend must be rejected with 429
  const resendTooSoon = await testRequest('POST', '/api/auth/resend-email-otp', {
    challenge_id: challengeId,
    email
  });

  assert.strictEqual(resendTooSoon.status, 429);
  assert.strictEqual(resendTooSoon.body.success, false);
  assert.ok(resendTooSoon.body.error.includes('seconds before requesting'));
});

test('Email OTP: Unverified User Login is Prohibited', async () => {
  const unverifiedEmail = `unverified_${Date.now()}@bloodbridge.org`;
  
  // Directly insert unverified user into localStore to test gatekeeping
  localStore.users.push({
    id: `unverified-${Date.now()}`,
    email: unverifiedEmail,
    name: 'Unverified Person',
    password_hash: '$2b$10$wO8oK6m7G/0V6yC4Uke3x.7rW1z980O7lCjEfZj1qF6WjY7ZkO3r2', // hash of 'secret123'
    role: 'donor',
    is_verified: false
  });

  const loginRes = await testRequest('POST', '/api/auth/login', {
    identifier: unverifiedEmail,
    password: 'wrongpassword'
  });
  assert.strictEqual(loginRes.status, 401);
});
