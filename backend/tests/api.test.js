const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

// Helper to make lightweight in-memory HTTP requests to Express app
async function testRequest(method, path, body = null, headers = {}) {
  const http = require('http');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const url = `http://127.0.0.1:${port}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const json = await res.json();
  await new Promise((resolve) => server.close(resolve));
  return { status: res.status, body: json };
}

test('API: Health Check Endpoint', async () => {
  const res = await testRequest('GET', '/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'healthy');
  assert.ok(res.body.clinical_disclaimer);
});

test('API: Authentication Flow (Signup, Login, Protected Role Check)', async () => {
  const testEmail = `testuser_${Date.now()}@bloodbridge.org`;
  const password = 'StrongPassword123!';

  // 1. Signup as Requester
  const signupRes = await testRequest('POST', '/api/auth/signup', {
    email: testEmail,
    password,
    name: 'Test Requester User',
    role: 'requester'
  });

  assert.strictEqual(signupRes.status, 201);
  assert.ok(signupRes.body.token);
  assert.strictEqual(signupRes.body.user.role, 'requester');
  const token = signupRes.body.token;

  // 2. Fetch /api/auth/me
  const meRes = await testRequest('GET', '/api/auth/me', null, {
    Authorization: `Bearer ${token}`
  });
  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meRes.body.user.email, testEmail);

  // 3. Attempt Admin-only route with Requester token (Must be rejected 403 Forbidden)
  const adminRes = await testRequest('GET', '/api/admin/summary', null, {
    Authorization: `Bearer ${token}`
  });
  assert.strictEqual(adminRes.status, 403);
  assert.strictEqual(adminRes.body.success, false);
  assert.ok(adminRes.body.error.includes('Access denied'));

  // 4. Login as Pre-seeded Admin
  const adminLogin = await testRequest('POST', '/api/auth/login', {
    email: 'admin@bloodbridge.org',
    password: 'BloodBridge2026!'
  });
  assert.strictEqual(adminLogin.status, 200);
  assert.strictEqual(adminLogin.body.user.role, 'admin');

  // 5. Access Admin Summary with Admin Token
  const adminSummary = await testRequest('GET', '/api/admin/summary', null, {
    Authorization: `Bearer ${adminLogin.body.token}`
  });
  assert.strictEqual(adminSummary.status, 200);
  assert.ok(adminSummary.body.metrics.donors.total >= 3);
  assert.ok(adminSummary.body.metrics.blood_banks.total >= 2);
});

test('API: Create Blood Request & Retrieve Matched Candidates', async () => {
  // Login as Requester
  const loginRes = await testRequest('POST', '/api/auth/login', {
    email: 'requester@bloodbridge.org',
    password: 'BloodBridge2026!'
  });
  const token = loginRes.body.token;

  // Create request
  const reqRes = await testRequest('POST', '/api/requests', {
    patient_name: 'Anita Desai',
    blood_group: 'B+',
    units_needed: 2,
    hospital_name: 'SMS Hospital',
    city: 'Jaipur',
    urgency: 'emergency',
    description: 'Emergency cardiac surgery'
  }, {
    Authorization: `Bearer ${token}`
  });

  assert.strictEqual(reqRes.status, 201);
  assert.strictEqual(reqRes.body.request.blood_group, 'B+');
  const requestId = reqRes.body.request.id;

  // Query candidate matches
  const matchRes = await testRequest('GET', `/api/requests/${requestId}/candidates?radius_km=30`);
  assert.strictEqual(matchRes.status, 200);
  assert.ok(matchRes.body.candidate_count > 0);
  assert.ok(matchRes.body.candidates[0].match_score > 0);
  assert.ok(matchRes.body.candidates[0].match_reasons.length > 0);
});
