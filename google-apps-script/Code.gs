/**
 * ============================================================================
 * BloodBridge Vision-X: Google Apps Script Webhook Integration
 * ============================================================================
 * 
 * Workflow:
 * Google Form -> Google Sheet -> Apps Script (onFormSubmit) -> BloodBridge Backend -> Supabase
 * 
 * SETUP INSTRUCTIONS:
 * 1. In your Google Sheet linked to the Google Form, open: Extensions -> Apps Script
 * 2. Paste this entire file into Code.gs
 * 3. Go to Project Settings (Gear Icon) -> Script Properties and add:
 *    - BLOODBRIDGE_WEBHOOK_URL: https://your-domain.com/api/integrations/google-forms/webhook
 *    - BLOODBRIDGE_SECRET_KEY: (same secret as GOOGLE_FORM_WEBHOOK_SECRET in backend .env)
 * 4. Add Trigger: Triggers (Clock Icon) -> Add Trigger:
 *    - Function: onFormSubmit
 *    - Event source: From spreadsheet
 *    - Event type: On form submit
 * 5. Run testBloodBridgeWebhook() from the toolbar dropdown to verify connectivity!
 */

/**
 * Main trigger function called automatically when a form is submitted
 */
function onFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var row = e && e.range ? e.range.getRow() : sheet.getLastRow();
  
  // Read Script Properties
  var scriptProperties = PropertiesService.getScriptProperties();
  var webhookUrl = scriptProperties.getProperty('BLOODBRIDGE_WEBHOOK_URL');
  var secretKey = scriptProperties.getProperty('BLOODBRIDGE_SECRET_KEY');
  
  if (!webhookUrl || !secretKey) {
    var errorMsg = 'ERROR: Missing BLOODBRIDGE_WEBHOOK_URL or BLOODBRIDGE_SECRET_KEY in Script Properties.';
    Logger.log(errorMsg);
    recordSyncStatus(sheet, row, 'CONFIG_ERROR: Set Script Properties in Apps Script');
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
  
  // Extract fields using fuzzy header matching
  var name = getFieldValue(formObject, ['full name', 'donor name', 'name', 'your name']);
  var bloodGroup = getFieldValue(formObject, ['blood group', 'blood type', 'group']);
  var city = getFieldValue(formObject, ['city', 'district', 'town', 'location']);
  var area = getFieldValue(formObject, ['area / locality', 'area', 'locality', 'tehsil', 'neighborhood']);
  var phone = getFieldValue(formObject, ['phone number', 'phone', 'contact number', 'mobile', 'whatsapp number']);
  var email = getFieldValue(formObject, ['email address', 'email']);
  var consent = getFieldValue(formObject, [
    'explicit consent to be contacted',
    'consent to be contacted',
    'do you consent to be contacted',
    'consent'
  ]);
  var donatedRecent = getFieldValue(formObject, [
    'have you donated blood during the previous three months?',
    'have you donated blood in the last 3 months?',
    'donated in last 3 months',
    'donated in previous 3 months',
    'donated last 3 months',
    'previous three months'
  ]);
  var lastDonation = getFieldValue(formObject, [
    'approximate date of last donation',
    'last donation date',
    'date of last blood donation',
    'last donation'
  ]);
  
  var timestamp = rowData[0] ? new Date(rowData[0]).toISOString() : new Date().toISOString();
  
  // Parse boolean values
  var consentBool = false;
  if (consent) {
    var cStr = consent.toString().toLowerCase();
    consentBool = cStr.indexOf('yes') !== -1 || cStr.indexOf('true') !== -1 || cStr.indexOf('consent') !== -1;
  }
  
  var donatedRecentBool = false;
  if (donatedRecent) {
    var dStr = donatedRecent.toString().toLowerCase();
    donatedRecentBool = dStr.indexOf('yes') !== -1 || dStr.indexOf('true') !== -1;
  }
  
  // Parse last donation date if provided
  var formattedLastDate = null;
  if (lastDonation) {
    try {
      var d = new Date(lastDonation);
      if (!isNaN(d.getTime())) {
        formattedLastDate = d.toISOString().split('T')[0];
      }
    } catch (dateErr) {
      // Keep null
    }
  }
  
  // Construct stable, validated payload
  var payload = {
    name: name.toString().trim(),
    blood_group: bloodGroup.toString().trim(),
    city: city ? city.toString().trim() : 'Lucknow',
    area: area ? area.toString().trim() : '',
    phone: phone ? phone.toString().trim() : '',
    email: email ? email.toString().trim() : '',
    consent_to_contact: consentBool,
    donated_last_3_months: donatedRecentBool,
    last_donation_date: formattedLastDate,
    submission_id: 'gform_row_' + row + '_' + new Date(timestamp).getTime()
  };
  
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
  
  // Record status back into Google Sheet
  if (success) {
    recordSyncStatus(sheet, row, 'SYNCED (' + new Date().toLocaleTimeString() + ')');
  } else {
    recordSyncStatus(sheet, row, 'FAILED: ' + responseText.slice(0, 120));
  }
}

/**
 * Helper to extract field value by checking multiple key candidates and partial matches
 */
function getFieldValue(formObject, candidateKeys) {
  // 1. Exact match on clean header key
  for (var i = 0; i < candidateKeys.length; i++) {
    var k = candidateKeys[i].toLowerCase();
    if (formObject[k] !== undefined && formObject[k] !== null && formObject[k] !== '') {
      return formObject[k];
    }
  }
  // 2. Partial substring search across all headers
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
 * Diagnostic test function: Run this from the Apps Script toolbar dropdown to test connection!
 */
function testBloodBridgeWebhook() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var webhookUrl = scriptProperties.getProperty('BLOODBRIDGE_WEBHOOK_URL');
  var secretKey = scriptProperties.getProperty('BLOODBRIDGE_SECRET_KEY');
  
  Logger.log('Target URL: ' + webhookUrl);
  Logger.log('Secret Configured: ' + (secretKey ? 'YES (Length: ' + secretKey.length + ')' : 'NO'));
  
  if (!webhookUrl || !secretKey) {
    Logger.log('FAILED: Please configure BLOODBRIDGE_WEBHOOK_URL and BLOODBRIDGE_SECRET_KEY in Script Properties first.');
    return;
  }
  
  var testPayload = {
    name: 'Test Volunteer (Apps Script Diagnostic)',
    blood_group: 'O+',
    city: 'Lucknow',
    phone: '9876543210',
    consent_to_contact: true,
    donated_last_3_months: false,
    submission_id: 'diagnostic_test_' + new Date().getTime()
  };
  
  try {
    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-webhook-secret': secretKey
      },
      payload: JSON.stringify(testPayload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(webhookUrl, options);
    Logger.log('Response Code: ' + response.getResponseCode());
    Logger.log('Response Body: ' + response.getContentText());
    
    if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
      Logger.log('SUCCESS! Google Apps Script can communicate securely with BloodBridge Vision-X.');
    } else {
      Logger.log('ERROR: Webhook returned HTTP ' + response.getResponseCode());
    }
  } catch (err) {
    Logger.log('EXCEPTION: ' + err.message);
  }
}
