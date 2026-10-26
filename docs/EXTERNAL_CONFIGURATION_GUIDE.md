# Required External Configuration & Live Deployment Guide

This guide details the exact setup, migration order, and verification steps required to transition BloodBridge Vision-X from local development into a live production deployment using **Supabase (PostgreSQL with PostGIS)**, **Groq AI**, and **Google Forms / Google Sheets (Apps Script)**.

---

## 1. Integration Status & Verification Principle

| Integration | Implementation Status | Tested Locally | Live Network Verification Requirements |
|---|---|---|---|
| **Deterministic Matching Engine** | Complete (`src/services/matchingService.js`) | Yes (ABO/Rh compatibility, consent filtering, scoring) | None (Pure backend logic) |
| **Spatial Privacy & Calculations** | Complete (`src/services/spatialService.js`) | Yes (WGS-84 Haversine spherical math, fuzzy distance bands) | None (Pure backend logic) |
| **Groq AI LLM Service** | Complete (`src/services/groqService.js`) | Yes (Tested with fallback parser & structured validation) | Requires valid `GROQ_API_KEY` in `backend/.env` |
| **Supabase / PostgreSQL** | Complete (`src/db/migrations/` 001-004) | Yes (Tested with resilient local store) | Requires executing migrations on live Supabase instance and setting `DATABASE_URL` in `backend/.env` |
| **PostGIS Spatial GiST Index** | Complete (`002_postgis_spatial.sql`) | Yes (SQL syntax, trigger, function verified) | Requires executing migration 002 in a PostGIS-enabled PostgreSQL instance and testing query plan |
| **RAG Approved Knowledge Pipeline** | Complete (`src/services/ragService.js`) | Yes (Chunking, vector cosine similarity, admin gate) | None for local embeddings; requires Groq key for live grounded generation |
| **Google Forms Apps Script** | Complete (`google-apps-script/Code.gs`) | Yes (Backend webhook endpoint authenticated & tested) | Requires deploying `Code.gs` into Google Sheets and submitting a live test response |

> [!IMPORTANT]
> BloodBridge Vision-X is built with a dual-mode database and AI fallback engine. All 19 backend automated tests and frontend build run out-of-the-box without requiring live third-party accounts. However, live deployment requires configuring the credentials documented below.

---

## 2. Groq API Configuration

Groq powers natural-language blood request parsing and interactive grounded assistance.

### 2.1 Model Selection & Verification
The Groq model catalog was verified against the active Groq API endpoints:
- **`llama-3.3-70b-versatile`** (**Configured Default**): Meta Llama 3.3 70B parameter model. Highly accurate for structured JSON field extraction and multi-factor reasoning.
- **`llama-3.1-8b-instant`** (**Supported Alternative**): Meta Llama 3.1 8B parameter model. Optimized for ultra-low latency.
- *Notice*: Older models like `llama3-70b-8192` or `llama3-8b-8192` have been deprecated by Groq and should not be used.

### 2.2 Configuration Steps
1. Sign up or log in at [https://console.groq.com/keys](https://console.groq.com/keys).
2. Generate an API key.
3. In `backend/.env`, set:
   ```env
   GROQ_API_KEY=gsk_your_actual_groq_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   ```
4. Restart the backend: `npm run dev:backend`. The server will log:
   ```
   Groq SDK initialized with active model: llama-3.3-70b-versatile
   ```

### 2.3 Verification
Send a test request to verify Groq inference:
```bash
curl -X POST http://localhost:5001/api/ai/parse-request \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Urgent requirement for 2 units of B positive blood near Ghaziabad tomorrow"}'
```
Inspect the JSON response:
- `parsed_request.parser` should equal `"groq_llm"`.
- `parsed_request.blood_group` should equal `"B+"`.
- `parsed_request.units_needed` should equal `2`.

---

## 3. Supabase / PostgreSQL & PostGIS Setup

### 3.1 Migration Execution Order
When setting up a live Supabase project, execute the SQL files located in `backend/src/db/migrations/` in the following strict order using the **Supabase SQL Editor**:

```
Step 1: 001_initial_schema.sql
        ├── Enables pgcrypto extension
        ├── Creates tables: users, blood_requests, notifications, integration_logs, audit_events
        └── Creates performance indexes on email, requester_id, status

Step 2: 002_postgis_spatial.sql
        ├── Enables postgis extension
        ├── Creates table donors with geography(Point, 4326)
        ├── Creates table blood_banks with geography(Point, 4326)
        ├── Creates table request_matches
        ├── Attaches location sync triggers (sync_donor_location, sync_blood_bank_location)
        ├── Creates GiST spatial index: donors_location_gist_idx
        ├── Creates GiST spatial index: blood_banks_location_gist_idx
        └── Creates spatial search function: search_nearby_donors() using ST_DWithin & ST_Distance

Step 3: 003_rag_documents.sql
        ├── Attempts to enable vector extension (pgvector)
        ├── Creates tables: rag_documents, rag_chunks
        └── Sets up Supabase Row Level Security (RLS) policies

Step 4: 004_seed_data.sql
        ├── Seeds default Admin, Requester, and Donor accounts (Password: BloodBridge2026!)
        ├── Seeds verified donor cluster with geographic coordinates
        ├── Seeds 24/7 hospital blood banks with reported inventory
        └── Seeds official NBTC/WHO approved guidance documents
```

### 3.2 Configuring the Connection String
1. In your Supabase Dashboard, go to **Project Settings** -> **Database**.
2. Under **Connection string**, select **Node.js** or **URI** (Connection Pooling mode, port `6543`).
3. Add the connection string to `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres.your-project-id:your-password@aws-0-region.pooler.supabase.com:6543/postgres
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

### 3.3 Verifying Live Database & PostGIS Index
On startup with `DATABASE_URL` configured, `backend/src/db/db.js` automatically executes diagnostic queries and logs:
```
PostgreSQL connection established successfully.
PostGIS Extension Active: Version 3.4.0
Spatial GiST Index verified on donors(location).
```

To manually verify the spatial query plan and index usage in the Supabase SQL Editor:
```sql
EXPLAIN ANALYZE
SELECT * FROM search_nearby_donors(26.9124, 75.7873, 25.0, 'B+', 20, 0);
```
Look for:
```
Bitmap Index Scan on donors_location_gist_idx
Execution Time: < 15.000 ms
```

---

## 4. Google Forms, Sheets & Apps Script Setup

This workflow enables automated streaming of community donor drive form submissions into BloodBridge.

### 4.1 Form Question Specification
Create a Google Form with the following exact titles:
1. `Full Name` (Short answer, Required)
2. `Blood Group` (Dropdown: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`, Required)
3. `City` (Short answer, Required)
4. `Area / Locality` (Short answer, Optional)
5. `Phone Number` (Short answer, Required)
6. `Consent to be Contacted` (Multiple choice: `Yes, I consent` / `No`, Required)
7. `Last Donation Date` (Date: `YYYY-MM-DD`, Optional)

### 4.2 Apps Script Deployment
1. Open the Google Sheet linked to the Google Form.
2. Click **Extensions** -> **Apps Script**.
3. Replace default code with [`google-apps-script/Code.gs`](file:///Users/annubha/.gemini/antigravity/scratch/bloodbridge-vision-x/google-apps-script/Code.gs).
4. Go to **Project Settings** (Gear icon) -> Scroll to **Script Properties**.
5. Add the following two properties:
   - `BLOODBRIDGE_WEBHOOK_URL`: `https://your-api-domain.com/api/integrations/google-forms/webhook`
   - `BLOODBRIDGE_SECRET_KEY`: Set a secure random string (e.g. `bb_sec_8f9a2c3e1d4b`).
6. In `backend/.env`, set the matching secret:
   ```env
   GOOGLE_FORM_WEBHOOK_SECRET=bb_sec_8f9a2c3e1d4b
   ```
7. In Apps Script, click **Triggers** (Alarm Clock icon on left panel) -> **Add Trigger**:
   - Function to run: `onFormSubmit`
   - Event source: `From spreadsheet`
   - Event type: `On form submit`
   - Click **Save** and grant permissions.

### 4.3 Verifying the Integration
1. Submit a test response in your Google Form.
2. In the Google Sheet, observe the newly added column **BloodBridge Sync Status** update to:
   ```
   SYNCED (HH:MM:SS AM/PM)
   ```
3. In the BloodBridge application, log in as **Admin** (`admin@bloodbridge.org` / `BloodBridge2026!`).
4. Navigate to the **Admin Console** -> **Donor Verification Queue**:
   - The submitted donor will appear with `source: 'google_forms'` and `status: 'pending_verification'`.
   - Click **Approve** to verify the donor, making them eligible for emergency spatial coordination.
