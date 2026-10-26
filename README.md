# BloodBridge Vision-X

> Emergency Blood Coordination Platform with PostGIS Geo-Indexing, Groq AI, and Approved Medical RAG Pipeline.

BloodBridge Vision-X is an emergency blood coordination and navigation platform designed to drastically reduce the time required to locate verified blood donors and licensed hospital blood banks during acute medical emergencies.

---

## Key Highlights

- **PostGIS Spatial Indexing**: SRID 4326 Geography Point with GiST spatial indexing (`CREATE INDEX donors_location_gist_idx ON donors USING GIST (location);`). Queries utilize `ST_DWithin` and `ST_Distance` on the database engine.
- **Strict Geo-Privacy**: Exact donor GPS coordinates and home addresses are strictly concealed from public API responses. Only approximate distance bands (e.g. *"Within 2 km"*, *"Within 5 km"*) are returned.
- **Groq LLM Request Parsing**: Extracts patient blood group, units, hospital, city, and urgency from freeform natural language text without hallucinating medical facts.
- **Approved Medical RAG Pipeline**: Real chunking, vector embedding, and cosine similarity matching grounded exclusively in approved NBTC, WHO, and DGHS documentation. Includes an Administrative Approval Gate.
- **Google Forms & Sheets Pipeline**: Ready-to-deploy Google Apps Script (`Code.gs`) that securely streams external donor registration drives into the database with `pending_verification` status.
- **Role-Based Portals**:
  - **Requester**: Create blood requests, view ranked compatible candidates, and query 24/7 blood banks.
  - **Donor**: Toggle emergency availability, update or withdraw contact consent, and record donation history.
  - **Admin**: Review donor verification queue, manage blood banks, upload/approve RAG documents, and inspect integration audit logs.

---

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Lucide Icons
- **Backend**: Node.js, Express.js, JWT Authentication, Helmet, Rate Limiting
- **Database**: PostgreSQL with PostGIS extension (Supabase compatible)
- **AI & LLM**: Groq SDK (`llama-3.3-70b-versatile`), TF-IDF/pgvector embedding pipeline
- **Integrations**: Google Forms, Google Sheets, Google Apps Script

---

## Getting Started

### 1. Prerequisites
- Node.js v18+ (tested on Node.js v24)
- npm v9+

### 2. Installation
Clone or navigate to the project directory:
```bash
cd bloodbridge-vision-x

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 3. Environment Setup
Copy the example environment configurations:
```bash
# In backend/
cp .env.example .env

# In frontend/
cp .env.example .env
```

Configure your secrets in `backend/.env`:
```env
PORT=5001
JWT_SECRET=your_jwt_secret_key
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GOOGLE_FORM_WEBHOOK_SECRET=your_webhook_secret
```

*(Note: The platform features a dual-mode database engine with PostGIS-equivalent spherical Haversine formulas and pre-seeded realistic data, allowing the entire full-stack system and all tests to execute out of the box even before configuring an external database!)*

### 4. Running the Application
From the root directory:
```bash
# Start backend (Port 5001)
npm run dev:backend

# In another terminal, start frontend (Port 5173)
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running the Automated Test Suite

Run the complete 19-test automated test suite covering authentication, role RBAC, donor matching, PostGIS spatial queries, Groq parsing, RAG pipeline, and webhook validation:

```bash
npm test
```

---

## External Configuration & Deployment Guides

For full instructions on configuring live cloud services, database migrations, and Apps Script:
- **[External Configuration Guide (Live Supabase, Groq & Google Apps Script)](docs/EXTERNAL_CONFIGURATION_GUIDE.md)**
- **[PostGIS Spatial Indexing & Geo-Privacy Guide](docs/POSTGIS_SPATIAL_GUIDE.md)**
- **[Retrieval-Augmented Generation (RAG) Architecture](docs/RAG_PIPELINE.md)**
- **[Google Forms Webhook Integration Setup](docs/GOOGLE_FORMS_SETUP.md)**
- **[Full System Architecture Specification](docs/ARCHITECTURE.md)**

---

## Pre-Seeded Demo Accounts (One-Click Login)

The login screen provides one-click demo login buttons for instant evaluation:
- **System Administrator**: `admin@bloodbridge.org` / `BloodBridge2026!`
- **Emergency Requester**: `requester@bloodbridge.org` / `BloodBridge2026!`
- **Verified Donor**: `donor@bloodbridge.org` / `BloodBridge2026!`

---

## Clinical Notice

*BloodBridge is an emergency coordination and search navigation platform, NOT a medical authority. Blood group and location matching indicates potential donor candidates, but NEVER constitutes clinical confirmation of compatibility. Final donor screening, antibody testing, cross-matching, and transfusion decisions belong strictly to licensed blood bank pathologists and attending physicians.*
