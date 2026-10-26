/**
 * BloodBridge Vision-X: Groq AI LLM Service
 * 
 * Implements Section 11 & 12:
 * - Natural Language Blood Request Extraction
 * - Backend-only AI integration
 * - Currently supported Groq models (e.g., llama-3.3-70b-versatile)
 * - Safe handling of model outputs, structured schema validation, fallback parser
 */

const Groq = require('groq-sdk');
const config = require('../config');
const { resolveCityCoordinates } = require('./spatialService');

let groqClient = null;

if (config.groqApiKey) {
  try {
    groqClient = new Groq({ apiKey: config.groqApiKey });
    console.log(`Groq SDK initialized with active model: ${config.groqModel}`);
  } catch (err) {
    console.warn('Groq SDK initialization notice:', err.message);
  }
} else {
  console.log('Notice: No GROQ_API_KEY configured in backend/.env. Using deterministic request parser and resilient local grounded responses.');
}

/**
 * Fallback deterministic parser for blood requests if Groq is offline or no key is provided
 */
function parseRequestDeterministically(text) {
  const normalized = text.toLowerCase();
  
  // Extract Blood Group (matches "B+", "B positive", "O-", "O negative", "AB+", etc.)
  const bloodGroupMatch = text.match(/\b(AB|A|B|O)\s*([+-]|positive|negative)/i);
  let blood_group = null;
  if (bloodGroupMatch) {
    const letter = bloodGroupMatch[1].toUpperCase();
    let sign = bloodGroupMatch[2].toUpperCase();
    if (sign === 'POSITIVE') sign = '+';
    if (sign === 'NEGATIVE') sign = '-';
    blood_group = `${letter}${sign}`;
  }

  // Extract Units
  const unitsMatch = text.match(/(\d+)\s*(unit|units|bottle|bottles|packet|packets|bag|bags)\b/i) || text.match(/need\s*(\d+)/i);
  const units_needed = unitsMatch ? parseInt(unitsMatch[1], 10) : 1;

  // Extract Urgency
  let urgency = 'urgent';
  if (/emergency|urgently|critical|immediate|asap|stat|life\s*threatening/i.test(normalized)) {
    urgency = 'emergency';
  } else if (/scheduled|routine|next week|advance/i.test(normalized)) {
    urgency = 'scheduled';
  }

  // Extract City / Location
  let detectedCity = null;
  const knownCities = ['jaipur', 'ghaziabad', 'delhi', 'noida', 'gurugram', 'mumbai', 'bengaluru', 'bangalore', 'pune', 'hyderabad', 'chennai', 'kolkata', 'lucknow'];
  for (const c of knownCities) {
    if (normalized.includes(c)) {
      detectedCity = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  const coords = detectedCity ? resolveCityCoordinates(detectedCity) : null;

  const missing_fields = [];
  if (!blood_group) missing_fields.push('blood_group');
  if (!detectedCity) missing_fields.push('location');

  return {
    blood_group,
    units_needed,
    urgency,
    location: detectedCity ? { city: detectedCity, latitude: coords ? coords.lat : null, longitude: coords ? coords.lon : null } : null,
    hospital_name: 'City Emergency Hospital',
    needed_by: /tomorrow/i.test(normalized) ? new Date(Date.now() + 86400000).toISOString() : new Date(Date.now() + 14400000).toISOString(),
    confidence: blood_group && detectedCity ? 0.85 : 0.45,
    missing_fields,
    parser: 'deterministic_fallback'
  };
}

/**
 * Extract structured blood request from natural language text using Groq LLM
 */
async function extractBloodRequestWithGroq(promptText) {
  if (!promptText || typeof promptText !== 'string' || promptText.trim().length === 0) {
    throw new Error('Please provide natural language text for the blood request.');
  }

  // If Groq is not configured or throws, use deterministic fallback
  if (!groqClient || !config.groqApiKey) {
    return parseRequestDeterministically(promptText);
  }

  const systemPrompt = `You are BloodBridge Vision-X request parser.
Your task is to extract structured blood requirement fields from natural language text.
You MUST output valid, raw JSON only. Do NOT include markdown code blocks, backticks, or explanatory text.
JSON Schema:
{
  "blood_group": "A+|A-|B+|B-|AB+|AB-|O+|O-|null",
  "units_needed": integer (default 1),
  "hospital_name": "string or null",
  "city": "string or null",
  "area": "string or null",
  "urgency": "emergency|urgent|scheduled",
  "needed_date": "YYYY-MM-DD or relative like 'tomorrow' or null",
  "description_summary": "concise summary of medical request",
  "missing_fields": ["array of strings identifying what crucial info is still missing"]
}`;

  try {
    const completion = await groqClient.chat.completions.create({
      model: config.groqModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptText }
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(rawContent);

    // Resolve geographic coordinates for extracted city if available
    let locationObj = null;
    if (parsed.city) {
      const coords = resolveCityCoordinates(parsed.city);
      locationObj = {
        city: parsed.city,
        area: parsed.area || null,
        latitude: coords ? coords.lat : null,
        longitude: coords ? coords.lon : null
      };
    }

    return {
      blood_group: parsed.blood_group || null,
      units_needed: Number.isInteger(parsed.units_needed) ? parsed.units_needed : 1,
      hospital_name: parsed.hospital_name || null,
      urgency: ['emergency', 'urgent', 'scheduled'].includes(parsed.urgency) ? parsed.urgency : 'urgent',
      location: locationObj,
      needed_by: parsed.needed_date || null,
      description: parsed.description_summary || promptText,
      missing_fields: Array.isArray(parsed.missing_fields) ? parsed.missing_fields : [],
      confidence: parsed.blood_group && locationObj ? 0.95 : 0.60,
      parser: 'groq_llm'
    };
  } catch (err) {
    console.warn('Groq extraction error, using deterministic fallback:', err.message);
    return parseRequestDeterministically(promptText);
  }
}

/**
 * Generate answer using Groq with grounded context
 */
async function generateGroundedAnswer({ question, contextChunks, conversationHistory = [] }) {
  if (!question) {
    throw new Error('Question is required.');
  }

  // Format context with citations
  let formattedContext = '';
  if (contextChunks && contextChunks.length > 0) {
    formattedContext = contextChunks
      .map((c, i) => `[Source ${i + 1}: ${c.title} (${c.source})]\n${c.content}`)
      .join('\n\n');
  } else {
    formattedContext = 'No approved platform documents matched this specific query.';
  }

  const systemPrompt = `You are BloodBridge Vision-X AI Assistant, an intelligent, empathetic emergency blood coordination assistant.
CRITICAL HEALTHCARE BOUNDARY RULES:
1. BloodBridge is a coordination and navigation platform, NOT a medical authority.
2. Blood group and location matching indicates potential donor candidates, NEVER clinical compatibility confirmation.
3. Cross-matching, testing, blood availability, and transfusion decisions strictly belong to licensed blood bank pathologists and authorized physicians.
4. Answer informational and eligibility questions ONLY using the provided approved context.
5. If the context does not contain enough information, clearly state that the information is not in the approved documents, and advise consulting an authorized healthcare professional or certified blood bank.
6. Always cite the Source number when answering from context.
7. Be concise, calm, and reassuring.`;

  const userPrompt = `Context from Approved Documentation:
${formattedContext}

User Question:
${question}

Please answer the user question grounded in the approved context and adhere strictly to the healthcare boundary rules. Include relevant source citations.`;

  if (!groqClient || !config.groqApiKey) {
    // Resilient local answer with full citations
    return {
      answer: `According to approved platform guidance: ${contextChunks && contextChunks.length > 0 ? contextChunks[0].content.slice(0, 300) + '...' : 'Please contact your nearest verified blood bank or attending physician.'}\n\nImportant: BloodBridge is a coordination platform, not a medical authority. Please confirm all clinical eligibility with healthcare professionals.`,
      sources: (contextChunks || []).map((c) => ({ title: c.title, source: c.source })),
      model: 'resilient_local_engine',
      grounded: contextChunks && contextChunks.length > 0
    };
  }

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-4),
      { role: 'user', content: userPrompt }
    ];

    const response = await groqClient.chat.completions.create({
      model: config.groqModel,
      messages,
      temperature: 0.2,
      max_tokens: 800
    });

    const answer = response.choices[0]?.message?.content || 'Unable to generate response at this time.';

    return {
      answer,
      sources: (contextChunks || []).map((c) => ({ title: c.title, source: c.source })),
      model: config.groqModel,
      grounded: contextChunks && contextChunks.length > 0
    };
  } catch (err) {
    console.error('Groq grounded completion error:', err.message);
    return {
      answer: `We encountered a temporary connection issue. Based on approved reference documentation: ${contextChunks && contextChunks.length > 0 ? contextChunks[0].content.slice(0, 300) + '...' : 'Please reach out directly to verified blood banks for immediate assistance.'}\n\nDisclaimer: BloodBridge coordinates; certified healthcare professionals decide clinical eligibility.`,
      sources: (contextChunks || []).map((c) => ({ title: c.title, source: c.source })),
      model: 'fallback_handler',
      grounded: contextChunks && contextChunks.length > 0
    };
  }
}

module.exports = {
  extractBloodRequestWithGroq,
  generateGroundedAnswer,
  parseRequestDeterministically,
  getGroqClient: () => groqClient
};
