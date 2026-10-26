const test = require('node:test');
const assert = require('node:assert');
const {
  chunkDocumentText,
  cleanText,
  ingestDocument,
  retrieveRelevantChunks,
  answerQuestionWithRAG
} = require('../src/services/ragService');
const { localStore } = require('../src/db/db');

test('RAG Service: Text Cleaning and Chunking', () => {
  const dirty = '  Line 1   with extra   spaces.\r\nLine 2 with \t tabs.  ';
  const cleaned = cleanText(dirty);
  assert.strictEqual(cleaned, 'Line 1 with extra spaces.\nLine 2 with tabs.');

  // Test chunking with word count
  const longText = Array.from({ length: 300 }, (_, i) => `word${i}`).join(' ');
  const chunks = chunkDocumentText(longText, 100, 20);
  assert.ok(chunks.length >= 3, `Expected at least 3 chunks, got ${chunks.length}`);
});

test('RAG Service: Administrative Approval Filter for Ingestion', async () => {
  // Ingest an unapproved (pending) document
  const unapprovedDoc = await ingestDocument({
    id: 'test-pending-doc-1',
    title: 'Unapproved Draft Guidelines',
    source: 'Draft Notes',
    content: 'Special unapproved instructions: Patients should eat 5 chocolates before donation.',
    status: 'pending' // Pending approval!
  });

  assert.strictEqual(unapprovedDoc.status, 'pending');

  // Query vector retrieval for "chocolates"
  const retrieved = await retrieveRelevantChunks('chocolates before donation', 3, 0.05);

  // Must NOT retrieve the pending/unapproved document
  const found = retrieved.find((c) => c.document_id === 'test-pending-doc-1');
  assert.strictEqual(found, undefined, 'Pending unapproved documents must never be retrieved for RAG answers');
});

test('RAG Service: Retrieval of Approved Medical Eligibility Documentation', async () => {
  // Query for donor eligibility interval
  const chunks = await retrieveRelevantChunks('How many days between blood donations for men and women?', 3, 0.05);

  assert.ok(chunks.length > 0, 'Should retrieve approved eligibility chunk');
  const top = chunks[0];
  assert.ok(top.content.includes('donation interval') || top.content.includes('90 days'));
  assert.strictEqual(top.title, 'General Blood Donation Eligibility Guidelines');
});

test('RAG Service: Grounded Answer Synthesis & Healthcare Disclaimer', async () => {
  const result = await answerQuestionWithRAG('Who can donate blood according to guidelines?');
  assert.ok(result.answer, 'Should generate an answer');
  assert.ok(result.disclaimer.includes('BloodBridge is an emergency coordination platform, not a medical authority'));
});
