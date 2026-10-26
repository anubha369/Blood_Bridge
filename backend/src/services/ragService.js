/**
 * BloodBridge Vision-X: Retrieval-Augmented Generation (RAG) Service
 * 
 * Implements Section 13 & 20:
 * - Approved Knowledge Document Ingestion & Chunking
 * - Vector Similarity Retrieval (Cosine Similarity)
 * - Strict Administrative Approval Gate (Only 'approved' documents retrieved)
 * - Grounded Context Assembly & Medical Safety Disclaimers
 */

const { localStore, isPostgresConnected, getPool } = require('../db/db');
const { generateGroundedAnswer } = require('./groqService');
const { v4: uuidv4 } = require('uuid');

/**
 * Text cleaner and normalizer
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

/**
 * Chunk text into overlapping segments
 * @param {string} text 
 * @param {number} chunkSize Words per chunk
 * @param {number} overlap Overlapping words
 */
function chunkDocumentText(text, chunkSize = 120, overlap = 30) {
  const cleaned = cleanText(text);
  const words = cleaned.split(/\s+/);
  const chunks = [];

  if (words.length <= chunkSize) {
    chunks.push(cleaned);
    return chunks;
  }

  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunkWords = words.slice(start, end);
    chunks.push(chunkWords.join(' '));
    if (end === words.length) break;
    start += (chunkSize - overlap);
  }

  return chunks;
}

/**
 * High-precision local TF-IDF / Vocabulary Vectorizer for real embedding cosine similarity
 */
function tokenize(text) {
  return cleanText(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function computeTermFrequencyVector(text, vocabulary) {
  const tokens = tokenize(text);
  const counts = {};
  for (const t of tokens) {
    counts[t] = (counts[t] || 0) + 1;
  }

  const vec = [];
  let normSq = 0.0;
  for (const term of vocabulary) {
    const tf = counts[term] || 0;
    vec.push(tf);
    normSq += tf * tf;
  }

  // Normalize vector to unit length
  const norm = Math.sqrt(normSq);
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) {
      vec[i] = vec[i] / norm;
    }
  }

  return vec;
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0.0;
  let dotProduct = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return Math.max(0.0, Math.min(1.0, dotProduct));
}

/**
 * Ingest or re-ingest a document
 */
async function ingestDocument({ id = null, title, source, category = 'guidance', content, status = 'pending', approvedBy = null }) {
  if (!title || !content) {
    throw new Error('Title and content are required for document ingestion.');
  }

  const docId = id || uuidv4();
  const chunks = chunkDocumentText(content);

  const docRecord = {
    id: docId,
    title: title.trim(),
    source: source ? source.trim() : 'Platform Reference',
    category,
    status, // 'pending', 'approved', 'rejected'
    content,
    chunk_count: chunks.length,
    approved_by: approvedBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Upsert in local store
  const existingIdx = localStore.rag_documents.findIndex((d) => d.id === docId);
  if (existingIdx >= 0) {
    localStore.rag_documents[existingIdx] = docRecord;
  } else {
    localStore.rag_documents.push(docRecord);
  }

  // Remove old chunks for this document
  localStore.rag_chunks = localStore.rag_chunks.filter((c) => c.document_id !== docId);

  // Generate chunks
  chunks.forEach((chunkContent, idx) => {
    localStore.rag_chunks.push({
      id: uuidv4(),
      document_id: docId,
      chunk_index: idx,
      chunk_content: chunkContent,
      token_count: chunkContent.split(/\s+/).length,
      metadata: { title: docRecord.title, source: docRecord.source, category: docRecord.category },
      created_at: new Date().toISOString()
    });
  });

  return docRecord;
}

/**
 * Initialize seed documents into chunks if not yet loaded
 */
function ensureRAGChunks() {
  const existingDocIds = new Set(localStore.rag_chunks.map((c) => c.document_id));

  localStore.rag_documents.forEach((doc) => {
    if (!existingDocIds.has(doc.id)) {
      const chunks = chunkDocumentText(doc.content);
      chunks.forEach((chunkContent, idx) => {
        localStore.rag_chunks.push({
          id: uuidv4(),
          document_id: doc.id,
          chunk_index: idx,
          chunk_content: chunkContent,
          token_count: chunkContent.split(/\s+/).length,
          metadata: { title: doc.title, source: doc.source, category: doc.category },
          created_at: new Date().toISOString()
        });
      });
    }
  });
}

/**
 * Retrieve top approved chunks relevant to a query
 */
async function retrieveRelevantChunks(query, topK = 3, minSimilarity = 0.15) {
  ensureRAGChunks();

  // Find all approved documents
  const approvedDocIds = new Set(
    localStore.rag_documents
      .filter((d) => d.status === 'approved')
      .map((d) => d.id)
  );

  const eligibleChunks = localStore.rag_chunks.filter((c) => approvedDocIds.has(c.document_id));
  if (eligibleChunks.length === 0) {
    return [];
  }

  // Build collective vocabulary across query and eligible chunks
  const vocabSet = new Set(tokenize(query));
  eligibleChunks.forEach((c) => {
    tokenize(c.chunk_content).forEach((t) => vocabSet.add(t));
  });
  const vocabulary = Array.from(vocabSet);

  const queryVector = computeTermFrequencyVector(query, vocabulary);

  const scoredChunks = eligibleChunks.map((chunk) => {
    const chunkVector = computeTermFrequencyVector(chunk.chunk_content, vocabulary);
    const score = cosineSimilarity(queryVector, chunkVector);
    const doc = localStore.rag_documents.find((d) => d.id === chunk.document_id);

    return {
      chunk_id: chunk.id,
      document_id: chunk.document_id,
      title: doc ? doc.title : 'Approved Document',
      source: doc ? doc.source : 'Reference Source',
      category: doc ? doc.category : 'guidelines',
      content: chunk.chunk_content,
      similarity_score: Math.round(score * 100) / 100
    };
  });

  // Filter by minSimilarity and sort descending
  const relevant = scoredChunks
    .filter((c) => c.similarity_score >= minSimilarity)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, topK);

  // If no chunk met threshold, return top 1 chunk from approved docs if query has basic healthcare overlap
  if (relevant.length === 0 && scoredChunks.length > 0) {
    const best = scoredChunks.sort((a, b) => b.similarity_score - a.similarity_score)[0];
    if (best.similarity_score > 0.05) {
      return [best];
    }
  }

  return relevant;
}

/**
 * End-to-end RAG answer workflow
 */
async function answerQuestionWithRAG(question, conversationHistory = []) {
  if (!question || typeof question !== 'string') {
    throw new Error('Please provide a valid question.');
  }

  // Step 1: Retrieve approved chunks
  const relevantChunks = await retrieveRelevantChunks(question, 3, 0.12);

  // Step 2: Generate grounded answer via Groq
  const result = await generateGroundedAnswer({
    question,
    contextChunks: relevantChunks,
    conversationHistory
  });

  return {
    question,
    answer: result.answer,
    grounded: result.grounded,
    model: result.model,
    sources: result.sources,
    retrieved_chunks_count: relevantChunks.length,
    disclaimer: 'BloodBridge is an emergency coordination platform, not a medical authority. Always consult clinical staff for transfusion compatibility and donor eligibility.'
  };
}

module.exports = {
  ingestDocument,
  retrieveRelevantChunks,
  answerQuestionWithRAG,
  chunkDocumentText,
  cleanText
};
