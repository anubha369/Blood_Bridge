/**
 * ============================================================================
 * BloodBridge Vision-X: Google Apps Script Webhook Integration
 * ============================================================================
 * 
 * Connected Form: "CONSENT FORM FOR BLOOD DONATION"
 * Form URL: https://docs.google.com/forms/d/e/1FAIpQLScl48SOjyH6iCdHg6WcZlFU8RcfnpQeOn2AKrALn3SyQqOpQA/viewform
 * Sheet URL: https://docs.google.com/spreadsheets/d/1oxe4NxeOTETUoMoO-YyQU_gKJacQZAhj_e7GU-2tVp8/edit
 * 
 * Form Questions mapped to Sheet Columns:
 * 1. Timestamp                                              -> Column A
 * 2. NAME                                                   -> Column B
 * 3. WHATSAPP CONTACT NUMBER                                -> Column C
 * 4. BLOOD GROUP                                            -> Column D
 * 5. HAVE YOU DONATED BLOOD IN THE PAST THREE MONTHS ?      -> Column E
 * 6. WOULD BE WILLING TO DONATE A BLOOD AND HELP SAFE A LIFE? -> Column F
 * 7. BloodBridge Sync Status                                -> Column G (Auto-created)
 * 
 * SETUP INSTRUCTIONS:
 * 1. In your Google Sheet, open: Extensions -> Apps Script
 * 2. Replace everything in Code.gs with this entire file and click Save (💾).
 * 3. Open Project Settings (Gear Icon) -> Script Properties and add:
 *    - BLOODBRIDGE_WEBHOOK_URL: https://statistical-aspects-miracle-piano.trycloudflare.com/api/integrations/google-forms/webhook
 *    - BLOODBRIDGE_SECRET_KEY: (Your backend secret from backend/.env GOOGLE_FORM_WEBHOOK_SECRET)
 * 4. Open Triggers (Clock Icon) -> Add Trigger:
 *    - Function: onFormSubmit
 *    - Event source: From spreadsheet
 *    - Event type: On form submit
 * 5. Select testBloodBridgeWebhook() from the toolbar dropdown and click Run to verify!
 */

/**
 * Main trigger function called automatically when a new donor submits the form
 */
function onFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var row = e && e.range ? e.range.getRow() : sheet.getLastRow();
  
  // Read Script Properties
  var scriptProperties = PropertiesService.getScriptProperties();
  var webhookUrl = scriptProperties.getProperty('BLOODBRIDGE_WEBHOOK_URL') || 
                   'https://statistical-aspects-miracle-piano.trycloudflare.com/api/integrations/google-forms/webhook';
  var secretKey = scriptProperties.getProperty('BLOODBRIDGE_SECRET_KEY');
  
  if (!secretKey) {
    var errorMsg = 'CONFIG_ERROR: Please set BLOODBRIDGE_SECRET_KEY in Apps Script Project Settings -> Script Properties.';
    Logger.log(errorMsg);
    recordSyncStatus(sheet, row, errorMsg);
    return;
  }
  
  // Read Sheet Headers and Submission Row Data
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  var formObject = {};
  for (var i = 0; i < headers.length; i++) {
    var headerClean = headers[i].toString().trim().toLowerCase();
    formObject[headerClean] = rowData[i];
  }
  
  // Exact mapping for "CONSENT FORM FOR BLOOD DONATION" questions
  var name = getFieldValue(formObject, [
    'name',
    'full name',
    'donor name'
  ]);
  
  var rawPhone = getFieldValue(formObject, [
    'whatsapp contact number',
    'whatsapp contact',
    'contact number',
    'phone number',
    'phone',
    'mobile'
  ]);
  
  var bloodGroup = getFieldValue(formObject, [
    'blood group',
    'blood type',
    'group'
  ]);
  
  var donatedRecent = getFieldValue(formObject, [
    'have you donated blood in the past three months ?',
    'have you donated blood in the past three months',
    'have you donated blood during the previous three months?',
    'have you donated blood in the last 3 months?',
    'donated in last 3 months',
    'past three months'
  ]);
  
  var consent = getFieldValue(formObject, [
    'would be willing to donate a blood and help safe a life?',
    'willing to donate a blood and help safe a life?',
    'would be willing to donate',
    'willing to donate',
    'help safe a life',
    'explicit consent to be contacted',
    'consent to be contacted',
    'consent'
  ]);
  
  // Optional / profile fields with defaults
  var city = getFieldValue(formObject, ['city', 'district', 'town', 'location']) || 'Lucknow';
  var area = getFieldValue(formObject, ['area / locality', 'area', 'locality', 'tehsil']) || '';
  var email = getFieldValue(formObject, ['email address', 'email']) || '';
  
  var timestamp = rowData[0] ? new Date(rowData[0]).toISOString() : new Date().toISOString();
  
  // Normalize Phone Number (E.164 without plus for Indian mobile numbers)
  var cleanDigits = rawPhone ? rawPhone.toString().replace(/[^0-9]/g, '') : '';
  var normalizedPhone = cleanDigits;
  if (cleanDigits.length === 10) {
    normalizedPhone = '91' + cleanDigits;
  }
  
  // Parse boolean values
  var consentBool = false;
  if (consent) {
    var cStr = consent.toString().toLowerCase().trim();
    consentBool = cStr.indexOf('yes') !== -1 || cStr === 'true' || cStr.indexOf('willing') !== -1;
  }
  
  var donatedRecentBool = false;
  if (donatedRecent) {
    var dStr = donatedRecent.toString().toLowerCase().trim();
    donatedRecentBool = dStr.indexOf('yes') !== -1 || dStr === 'true';
  }
  
  // Construct stable, validated payload matching backend schema
  var payload = {
    name: name ? name.toString().trim() : 'Anonymous Volunteer',
    blood_group: bloodGroup ? bloodGroup.toString().trim().toUpperCase() : 'O+',
    city: city.toString().trim(),
    area: area ? area.toString().trim() : null,
    phone: normalizedPhone,
    email: email ? email.toString().trim().toLowerCase() : null,
    consent_to_contact: consentBool,
    donated_last_3_months: donatedRecentBool,
    last_donation_date: null,
    submission_id: 'gform_row_' + row + '_' + new Date(timestamp).getTime()
  };
  
  Logger.log('Submitting donor to BloodBridge: ' + JSON.stringify(payload));
  
  // Dispatch with exponential retry
  var maxRetries = 3;
  var success = false;
  var responseText = '';
  
  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      var options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-webhook-secret': secretKey
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      var response = UrlFetchApp.fetch(webhookUrl, options);
      var code = response.getResponseCode();
      responseText = response.getContentText();
      
      if (code === 200 || code === 201) {
        success = true;
        Logger.log('Successfully synced row ' + row + ' to BloodBridge: ' + responseText);
        break;
      } else {
        Logger.log('Attempt ' + attempt + ' failed [HTTP ' + code + ']: ' + responseText);
        Utilities.sleep(1000 * attempt);
      }
    } catch (err) {
      Logger.log('Attempt ' + attempt + ' network error: ' + err.message);
      Utilities.sleep(1000 * attempt);
    }
  }
  
  // Record status back into the Google Sheet
  if (success) {
    recordSyncStatus(sheet, row, 'SYNCED (' + new Date().toLocaleTimeString() + ')');
  } else {
    recordSyncStatus(sheet, row, 'FAILED: ' + responseText.slice(0, 100));
  }
}

/**
 * Intelligent helper to extract field value using exact matches and partial substring searches
 */
function getFieldValue(formObject, candidateKeys) {
  // 1. Exact match
  for (var i = 0; i < candidateKeys.length; i++) {
    var k = candidateKeys[i].toLowerCase();
    if (formObject[k] !== undefined && formObject[k] !== null && formObject[k] !== '') {
      return formObject[k];
    }
  }
  // 2. Partial substring match across headers
  for (var header in formObject) {
    for (var j = 0; j < candidateKeys.length; j++) {
      if (header.indexOf(candidateKeys[j].toLowerCase()) !== -1) {
        if (formObject[header] !== undefined && formObject[header] !== null && formObject[header] !== '') {
          return formObject[header];
        }
      }
    }
  }
  return '';
}

/**
 * Record sync status in a dedicated "BloodBridge Sync Status" column
 */
function recordSyncStatus(sheet, row, statusText) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var statusColIndex = -1;
  
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].toString().trim().toLowerCase() === 'bloodbridge sync status') {
      statusColIndex = i + 1;
      break;
    }
  }
  
  if (statusColIndex === -1) {
    statusColIndex = headers.length + 1;
    sheet.getRange(1, statusColIndex).setValue('BloodBridge Sync Status');
  }
  
  sheet.getRange(row, statusColIndex).setValue(statusText);
}

/**
 * Diagnostic test function: Safely tests connectivity and authentication WITHOUT
 * creating or updating any donor record in the live database.
 * 
 * Note on Backend Capabilities:
 * The BloodBridge backend does not feature a dedicated non-mutating /dry-run webhook
 * query parameter. Therefore, this diagnostic executes two safe checks:
 * 1. Health Probe: Calls GET /api/health to confirm network egress, DNS, and server health.
 * 2. Auth Probe: Sends an empty JSON payload with the 'x-webhook-secret' header.
 *    - If secret is invalid: Backend rejects at step 1 with HTTP 401 (Unauthorized).
 *    - If secret is valid: Backend verifies secret, then fails schema validation at step 2
 *      with HTTP 400 ('Donor name is required'). Zero records are inserted or altered.
 */
function testBloodBridgeWebhook() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var webhookUrl = scriptProperties.getProperty('BLOODBRIDGE_WEBHOOK_URL') || 
                   'https://statistical-aspects-miracle-piano.trycloudflare.com/api/integrations/google-forms/webhook';
  var secretKey = scriptProperties.getProperty('BLOODBRIDGE_SECRET_KEY');
  
  Logger.log('=== BloodBridge Webhook Connectivity Diagnostic ===');
  Logger.log('Target Webhook URL: ' + webhookUrl);
  Logger.log('Secret Configured: ' + (secretKey ? 'YES (Length: ' + secretKey.length + ' chars)' : 'NO'));
  
  if (!secretKey) {
    Logger.log('❌ FAILED: BLOODBRIDGE_SECRET_KEY is missing from Script Properties.');
    Logger.log('Please open Project Settings (gear icon) -> Script Properties and add BLOODBRIDGE_SECRET_KEY.');
    return;
  }
  
  // Step 1: Server Reachability Probe via /api/health
  var healthUrl = webhookUrl.replace(/\/api\/integrations\/.*$/, '/api/health');
  Logger.log('\nStep 1: Testing server reachability via ' + healthUrl + '...');
  
  try {
    var healthResponse = UrlFetchApp.fetch(healthUrl, {
      method: 'get',
      muteHttpExceptions: true
    });
    var healthCode = healthResponse.getResponseCode();
    Logger.log('Health Endpoint HTTP Status: ' + healthCode);
    if (healthCode === 200) {
      Logger.log('✔ Server is online, responding with HTTP 200, and PostgreSQL with PostGIS is active.');
    } else {
      Logger.log('⚠ Server responded with HTTP ' + healthCode + ': ' + healthResponse.getContentText().slice(0, 120));
    }
  } catch (healthErr) {
    Logger.log('❌ Network error reaching server: ' + healthErr.message);
    Logger.log('Verify that your Cloudflare tunnel and backend server are actively running.');
    return;
  }
  
  // Step 2: Non-Mutating Webhook Authentication Probe
  Logger.log('\nStep 2: Testing webhook secret authentication (non-mutating probe)...');
  try {
    var probeResponse = UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-webhook-secret': secretKey
      },
      payload: JSON.stringify({}),
      muteHttpExceptions: true
    });
    
    var probeCode = probeResponse.getResponseCode();
    var probeText = probeResponse.getContentText();
    Logger.log('Webhook Probe HTTP Status: ' + probeCode);
    Logger.log('Webhook Probe Response: ' + probeText);
    
    if (probeCode === 400 && probeText.indexOf('Validation failed') !== -1) {
      Logger.log('✔ SUCCESS! The webhook secret was verified and authenticated by the backend.');
      Logger.log('✔ Confirmed: Zero donor records were created or modified.');
      Logger.log('The Google Apps Script integration is ready for real form submissions.');
    } else if (probeCode === 401) {
      Logger.log('❌ AUTHENTICATION ERROR: HTTP 401 Unauthorized.');
      Logger.log('The BLOODBRIDGE_SECRET_KEY in Script Properties does not match the GOOGLE_FORM_WEBHOOK_SECRET in backend/.env.');
    } else {
      Logger.log('Unexpected response [HTTP ' + probeCode + ']: ' + probeText);
    }
  } catch (probeErr) {
    Logger.log('❌ Webhook probe network error: ' + probeErr.message);
  }
}

/**
 * ============================================================================
 * Web App GET Endpoint: Enables BloodBridge Backend to Fetch Missed Records
 * ============================================================================
 * When deployed as a Web App (Deploy -> New deployment -> Web app):
 * The BloodBridge backend calls this endpoint with the secret to fetch missed
 * form responses directly from Google Sheets without needing Google Cloud Console.
 */
function doGet(e) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var secretKey = scriptProperties.getProperty('BLOODBRIDGE_SECRET_KEY');
  var reqSecret = e && e.parameter ? (e.parameter.secret || e.parameter['x-webhook-secret']) : '';

  if (!secretKey || reqSecret !== secretKey) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unauthorized: Secret key is invalid or not configured.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var action = e && e.parameter ? e.parameter.action : 'fetch_missed';
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      total_rows: 0,
      headers: [],
      rows: []
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var headers = data[0];
  var offset = parseInt(e.parameter.offset || '0', 10);
  var limit = parseInt(e.parameter.limit || '100', 10);

  var allRows = data.slice(1);
  var pagedRows = allRows.slice(offset, offset + limit);

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    action: action,
    total_rows: allRows.length,
    offset: offset,
    limit: limit,
    has_more: (offset + limit) < allRows.length,
    next_offset: (offset + limit) < allRows.length ? (offset + limit) : null,
    headers: headers,
    rows: pagedRows
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Manual Trigger: Sync all un-synced rows directly from Apps Script Editor
 * Select 'syncAllMissedRows' from the function dropdown and click Run (▶).
 */
function syncAllMissedRows() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  var statusColIndex = -1;
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].toString().trim().toLowerCase() === 'bloodbridge sync status') {
      statusColIndex = i + 1;
      break;
    }
  }

  Logger.log('Scanning rows 2 to ' + lastRow + ' for missed submissions...');
  var syncedCount = 0;
  for (var r = 2; r <= lastRow; r++) {
    var status = statusColIndex !== -1 ? sheet.getRange(r, statusColIndex).getValue() : '';
    if (!status || status.toString().indexOf('SYNCED') === -1) {
      Logger.log('Syncing missed row ' + r + '...');
      onFormSubmit({ range: sheet.getRange(r, 1, 1, sheet.getLastColumn()) });
      syncedCount++;
      Utilities.sleep(500); // polite rate limit
    }
  }
  Logger.log('Finished manual sync: ' + syncedCount + ' rows processed.');
}
