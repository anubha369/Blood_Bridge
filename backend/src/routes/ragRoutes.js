const express = require('express');
const router = express.Router();
const { localStore } = require('../db/db');
const { ingestDocument, retrieveRelevantChunks } = require('../services/ragService');
const { authenticateUser, requireRole, optionalAuth } = require('../middleware/auth');

// GET /api/rag/documents
router.get('/documents', optionalAuth, (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  let docs = [...localStore.rag_documents];

  if (!isAdmin) {
    // Only approved documents visible to general public/requesters
    docs = docs.filter((d) => d.status === 'approved');
  }

  return res.json({
    success: true,
    count: docs.length,
    documents: docs
  });
});

// POST /api/rag/documents
// Admin creates / ingests new document
router.post('/documents', authenticateUser, requireRole(['admin']), async (req, res, next) => {
  try {
    const { title, source, category = 'guidance', content, status = 'approved' } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required.' });
    }

    const doc = await ingestDocument({
      title,
      source,
      category,
      content,
      status: ['pending', 'approved', 'rejected'].includes(status) ? status : 'pending',
      approvedBy: status === 'approved' ? req.user.id : null
    });

    return res.status(201).json({
      success: true,
      message: `Document ingested successfully into ${doc.chunk_count} chunk(s). Status: ${doc.status}`,
      document: doc
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/rag/documents/:id/status
// Admin approve or reject document
router.patch('/documents/:id/status', authenticateUser, requireRole(['admin']), (req, res) => {
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Status must be one of: pending, approved, rejected.' });
  }

  const doc = localStore.rag_documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Document not found.' });
  }

  doc.status = status;
  doc.updated_at = new Date().toISOString();
  if (status === 'approved') {
    doc.approved_by = req.user.id;
  }

  return res.json({
    success: true,
    message: `Document status updated to "${status}".`,
    document: doc
  });
});

// POST /api/rag/documents/:id/reingest
// Admin re-ingest document
router.post('/documents/:id/reingest', authenticateUser, requireRole(['admin']), async (req, res, next) => {
  try {
    const doc = localStore.rag_documents.find((d) => d.id === req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const updated = await ingestDocument({
      id: doc.id,
      title: doc.title,
      source: doc.source,
      category: doc.category,
      content: doc.content,
      status: doc.status,
      approvedBy: doc.approved_by
    });

    return res.json({
      success: true,
      message: `Document re-ingested successfully into ${updated.chunk_count} chunks.`,
      document: updated
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/rag/documents/:id
router.delete('/documents/:id', authenticateUser, requireRole(['admin']), (req, res) => {
  const docIdx = localStore.rag_documents.findIndex((d) => d.id === req.params.id);
  if (docIdx === -1) {
    return res.status(404).json({ success: false, error: 'Document not found.' });
  }

  const docId = localStore.rag_documents[docIdx].id;
  localStore.rag_documents.splice(docIdx, 1);
  localStore.rag_chunks = localStore.rag_chunks.filter((c) => c.document_id !== docId);

  return res.json({
    success: true,
    message: 'Document and its chunks deleted successfully.'
  });
});

// POST /api/rag/query
// Testing endpoint to evaluate vector similarity retrieval
router.post('/query', async (req, res, next) => {
  try {
    const { query, top_k = 3, min_similarity = 0.1 } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required.' });
    }

    const chunks = await retrieveRelevantChunks(query, parseInt(top_k, 10), parseFloat(min_similarity));

    return res.json({
      success: true,
      query,
      retrieved_count: chunks.length,
      chunks
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
