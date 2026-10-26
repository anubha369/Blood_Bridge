# Google Forms & Google Sheets Webhook Integration Guide

This document outlines the setup required to automatically stream donor drive registrations from Google Forms into BloodBridge Vision-X.

## Architecture

```
[Public Google Form]
        │
        ▼
[Google Sheet Responses]
        │ (onFormSubmit Trigger)
        ▼
[Google Apps Script (Code.gs)]
        │ (Signed HTTPS POST with x-webhook-secret)
        ▼
[BloodBridge Backend Webhook: POST /api/integrations/google-forms/webhook]
        │
        ▼
[Payload Validation & City Geocoding]
        │
        ▼
[Supabase/Database (status: 'pending_verification')]
```

## Setup Instructions

1. **Create Google Form**:
   - Add fields: Full Name, Blood Group, City, Area / Locality, Phone Number, Consent to be Contacted (Yes/No), Last Donation Date.
2. **Open Connected Sheet**:
   - In Google Forms, click **Responses** -> **Link to Sheets**.
3. **Add Google Apps Script**:
   - Open **Extensions** -> **Apps Script**.
   - Copy the contents of [`google-apps-script/Code.gs`](file:///Users/annubha/.gemini/antigravity/scratch/bloodbridge-vision-x/google-apps-script/Code.gs) into `Code.gs`.
4. **Configure Secrets**:
   - In Apps Script, open **Project Settings** -> **Script Properties**.
   - Add:
     - `BLOODBRIDGE_WEBHOOK_URL`: `https://your-api-domain.com/api/integrations/google-forms/webhook`
     - `BLOODBRIDGE_SECRET_KEY`: (matching `GOOGLE_FORM_WEBHOOK_SECRET` in backend `.env`)
5. **Add Trigger**:
   - Go to **Triggers** -> **Add Trigger**.
   - Event source: `From spreadsheet`
   - Event type: `On form submit`
   - Select function: `onFormSubmit`
6. **Verification in Admin Console**:
   - Incoming submissions appear in the **Admin Console** under the **Donor Verification Queue** with `pending_verification` status.
   - Administrators review the submission and click **Approve** or **Reject**.
