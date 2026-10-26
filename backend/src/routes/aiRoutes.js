const express = require('express');
const router = express.Router();
const { extractBloodRequestWithGroq } = require('../services/groqService');
const { answerQuestionWithRAG } = require('../services/ragService');
const { aiLimiter } = require('../middleware/rateLimiter');
const { optionalAuth } = require('../middleware/auth');

// POST /api/ai/parse-request
// Natural-Language Blood Request Extraction
router.post('/parse-request', aiLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a natural-language description of the blood requirement.'
      });
    }

    const structured = await extractBloodRequestWithGroq(prompt);

    return res.json({
      success: true,
      original_prompt: prompt,
      parsed_request: structured,
      disclaimer: 'Extracted fields should be verified by the requester before creating an active emergency blood request.'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/assistant
// Interactive RAG-grounded AI Assistant with citations and clinical boundary protections
router.post('/assistant', aiLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { question, conversation_history = [] } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Question is required.'
      });
    }

    const response = await answerQuestionWithRAG(question, conversation_history);

    return res.json({
      success: true,
      ...response
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
