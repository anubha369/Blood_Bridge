# Google Forms & Google Sheets Integration Guide

This guide details how to link a public Google Form donor registration workflow to the BloodBridge Vision-X backend.

## Workflow Overview
1. **Donor fills Google Form** (Name, Blood Group, City, Contact Number, Consent to be Contacted).
2. **Google Form saves response** to Google Sheets.
3. **Google Apps Script** triggers on form submit (`onFormSubmit`).
4. **Apps Script posts JSON** with an authentication secret header (`x-webhook-secret`).
5. **BloodBridge Backend** verifies the secret, validates fields, resolves coordinates, and creates a donor record with `pending_verification` status.
6. **Apps Script stamps sync status** ("SYNCED" or "FAILED") directly into the Google Sheet.

---

## Form Field Specifications

Configure your Google Form with the following questions:

| Question Title | Question Type | Options / Validation | Required |
|---|---|---|---|
| Full Name | Short answer | Text | Yes |
| Blood Group | Multiple choice / Dropdown | A+, A-, B+, B-, AB+, AB-, O+, O- | Yes |
| City | Short answer | Text (e.g. Jaipur, Ghaziabad, Delhi) | Yes |
| Area / Locality | Short answer | Text (e.g. Malviya Nagar) | No |
| Phone Number | Short answer | 10-digit number | Yes |
| Consent to be Contacted | Multiple choice | Yes, I consent / No | Yes |
| Last Donation Date | Date | YYYY-MM-DD | No |

---

## Setup Steps

1. In your Google Sheet, click **Extensions** -> **Apps Script**.
2. Replace default code with the contents of [`Code.gs`](file:///Users/annubha/.gemini/antigravity/scratch/bloodbridge-vision-x/google-apps-script/Code.gs).
3. In Apps Script, click the **Gear Icon** (Project Settings) -> Scroll to **Script Properties**.
4. Add two properties:
   - `BLOODBRIDGE_WEBHOOK_URL`: `https://<YOUR-API-HOST>/api/integrations/google-forms/webhook`
   - `BLOODBRIDGE_SECRET_KEY`: `<YOUR_SECRET>` (matching `GOOGLE_FORM_WEBHOOK_SECRET` in backend `.env`)
5. Click **Triggers** (Alarm Clock icon on left) -> **Add Trigger**:
   - Choose which function to run: `onFormSubmit`
   - Select event source: `From spreadsheet`
   - Select event type: `On form submit`
   - Click **Save** and grant permissions.
