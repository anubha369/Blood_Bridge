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
 * 3. Go to Project Settings -> Script Properties and add:
 *    - BLOODBRIDGE_WEBHOOK_URL: https://your-domain.com/api/integrations/google-forms/webhook
 *    - BLOODBRIDGE_SECRET_KEY: (same secret as GOOGLE_FORM_WEBHOOK_SECRET in backend .env)
 * 4. Add Trigger: Triggers -> Add Trigger -> onFormSubmit -> From spreadsheet -> On form submit
 */

/**
 * Triggered automatically upon every Google Form submission
 */
function onFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var row = e ? e.range.getRow() : sheet.getLastRow();
  
  // Read Script Properties
  var scriptProperties = PropertiesService.getScriptProperties();
  var webhookUrl = scriptProperties.getProperty('BLOODBRIDGE_WEBHOOK_URL');
  var secretKey = scriptProperties.getProperty('BLOODBRIDGE_SECRET_KEY');
  
  if (!webhookUrl || !secretKey) {
    Logger.log('ERROR: Missing BLOODBRIDGE_WEBHOOK_URL or BLOODBRIDGE_SECRET_KEY in Script Properties.');
    return;
  }
  
  // Map form response columns (adapt index numbers to match your sheet column order)
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  var formObject = {};
  for (var i = 0; i < headers.length; i++) {
    formObject[headers[i].toString().trim().toLowerCase()] = rowData[i];
  }
  
  // Extract fields with fallbacks for common question titles
  var name = formObject['full name'] || formObject['name'] || formObject['donor name'] || '';
  var bloodGroup = formObject['blood group'] || formObject['blood type'] || '';
  var city = formObject['city'] || formObject['district'] || '';
  var area = formObject['area / locality'] || formObject['area'] || formObject['locality'] || '';
  var phone = formObject['phone number'] || formObject['phone'] || formObject['contact number'] || '';
  var email = formObject['email address'] || formObject['email'] || '';
  var consent = formObject['consent to be contacted'] || formObject['consent'] || 'Yes';
  var lastDonation = formObject['last donation date'] || '';
  var timestamp = rowData[0] || new Date().toISOString();
  
  var payload = {
    name: name.toString(),
    blood_group: bloodGroup.toString(),
    city: city.toString(),
    area: area.toString(),
    phone: phone.toString(),
    email: email.toString(),
    consent_to_contact: consent.toString().toLowerCase().indexOf('yes') !== -1 || consent === true,
    last_donation_date: lastDonation ? new Date(lastDonation).toISOString().split('T')[0] : null,
    submission_id: 'gform_' + row + '_' + new Date(timestamp).getTime()
  };
  
  // Send to BloodBridge backend API with retry logic
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
        break;
      } else {
        Logger.log('Attempt ' + attempt + ' failed with HTTP ' + code + ': ' + responseText);
        Utilities.sleep(1500 * attempt);
      }
    } catch (err) {
      Logger.log('Attempt ' + attempt + ' error: ' + err.message);
      Utilities.sleep(1500 * attempt);
    }
  }
  
  // Record status back into the sheet in an added "BloodBridge Sync Status" column
  var statusColIndex = headers.indexOf('bloodbridge sync status') + 1;
  if (statusColIndex === 0) {
    statusColIndex = headers.length + 1;
    sheet.getRange(1, statusColIndex).setValue('BloodBridge Sync Status');
  }
  
  if (success) {
    sheet.getRange(row, statusColIndex).setValue('SYNCED (' + new Date().toLocaleTimeString() + ')');
  } else {
    sheet.getRange(row, statusColIndex).setValue('FAILED: ' + responseText.slice(0, 100));
  }
}
