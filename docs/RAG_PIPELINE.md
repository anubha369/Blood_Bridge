# Retrieval-Augmented Generation (RAG) Pipeline

## 1. Approved Knowledge Document Sources

The platform restricts its RAG pipeline to official health authority documentation:
- **National Blood Transfusion Council (NBTC)** donor eligibility norms
- **World Health Organization (WHO)** blood transfusion safety guidelines
- **Directorate General of Health Services (DGHS)** blood group science & universal donor principles
- **BloodBridge Vision-X** operational workflow guides

---

## 2. Ingestion & Approval Workflow

```
[Document Text / Upload] 
       │
       ▼
[Text Cleaning & Normalization]
       │
       ▼
[Chunking (120 words with 30-word overlap)]
       │
       ▼
[Vector Embedding Representation]
       │
       ▼
[Database Storage (Status: 'pending')]
       │
       ▼
[Admin Review & Approval] ──► Status: 'approved' (Eligible for AI Retrieval)
```

Documents marked `pending` or `rejected` are **strictly blocked from retrieval queries**.

---

## 3. Retrieval & Grounding Mechanism

When a user submits an eligibility or coordination question:
1. The question is tokenized and vectorized into a normalized unit vector.
2. Cosine similarity is computed against all approved document chunks.
3. Top chunks exceeding the similarity threshold (score >= 0.12) are assembled into a structured prompt context.
4. Groq LLM (`llama-3.3-70b-versatile`) synthesizes an answer referencing the numbered sources.
5. If no chunk contains the answer, the model responds with: *"This information is not covered in approved documentation. Please consult your physician or verified blood bank."*
6. A mandatory medical disclaimer is appended to every response.
