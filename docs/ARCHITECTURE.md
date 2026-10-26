# BloodBridge Vision-X Architecture Specification

## 1. System Overview

BloodBridge Vision-X is an emergency blood coordination and search navigation platform. Its core architecture separates medical decision-making (strictly reserved for licensed clinical pathologists and blood bank doctors) from high-speed digital coordination, spatial search, and AI-assisted workflow navigation.

```
+---------------------------------------------------------------------------------------+
|                                    USER INTERFACES                                    |
|   +-----------------------+   +-----------------------+   +-----------------------+   |
|   |   Requester Portal    |   |     Donor Portal      |   |  Admin & Verification |   |
|   |  - Emergency Requests |   |  - Consent Management |   |  - Donor Review Queue |   |
|   |  - Proximity Search   |   |  - Availability Toggle|   |  - RAG Knowledge Base |   |
|   |  - Candidate Ranking  |   |  - Donation History   |   |  - Analytics & Audit  |   |
|   +-----------------------+   +-----------------------+   +-----------------------+   |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v (REST API / Bearer JWT)
+-------------------------------------------+-------------------------------------------+
|                              NODE.JS / EXPRESS BACKEND                                |
|  +--------------------+  +---------------------+  +--------------------+              |
|  |  Role Auth & Rate  |  |  Spatial Service    |  | Deterministic      |              |
|  |  Limiter Security  |  |  (PostGIS ST_DWithin|  | Matching Engine    |              |
|  |  (JWT & Helmet)    |  |  SRID 4326 & GiST)   |  | (ABO Compatibility)|              |
|  +--------------------+  +---------------------+  +--------------------+              |
|                                                                                       |
|  +--------------------+  +---------------------+  +--------------------+              |
|  |  Groq AI LLM       |  |  Vector RAG Pipeline|  | Google Forms       |              |
|  |  (Request Parsing) |  |  (Approved Chunks & |  | Webhook Service    |              |
|  |  llama-3.3-70b     |  |   Cosine Similarity)|  | (Secret Signed)    |              |
|  +--------------------+  +---------------------+  +--------------------+              |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+-------------------------------------------+-------------------------------------------+
|                          DATABASE & STORAGE (SUPABASE)                                |
|  - Users (Requester, Donor, Admin Roles)                                              |
|  - Donors (PostGIS geography(Point, 4326), GiST Spatial Index, Consent Flag)          |
|  - Blood Requests & Request Matches (Deterministic Match Scores)                      |
|  - Blood Banks (NABH / Red Cross 24/7 Verified Records)                              |
|  - RAG Documents & Chunks (Admin Approved Gate, Embedding Vectors)                    |
|  - Integration Logs & Audit Trail                                                     |
+---------------------------------------------------------------------------------------+
```

---

## 2. Security & Healthcare Boundaries

1. **Coordination Boundary**: BloodBridge is an information navigation platform. Algorithms output "potential donor candidates", never clinical confirmation of compatibility.
2. **Geo-Privacy Policy**: Exact donor GPS coordinates and home addresses are strictly kept server-side. Public search responses only reveal approximate fuzzy distance bands (e.g., "Within 2 km", "Within 5 km").
3. **Consent Enforcement**: Only donors who have granted explicit contact consent and are marked `available` are included in public search queries. Consent withdrawal takes effect instantly across all search queries.
4. **Administrative Verification Gate**: External registrations from Google Forms enter with `pending_verification` status and require admin review before being marked as fully verified.
