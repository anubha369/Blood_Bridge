require('dotenv').config();

const config = {
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'bloodbridge-vision-x-jwt-secure-secret-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Supabase & PostgreSQL
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',

  // Groq AI
  groqApiKey: process.env.GROQ_API_KEY || '',
  // Currently supported Groq models:
  // - 'llama-3.3-70b-versatile' (Recommended: high accuracy, structured JSON extraction)
  // - 'llama-3.1-8b-instant' (Alternative: low-latency, fast throughput)
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',

  // Google Forms / Apps Script Webhook Secret
  googleFormWebhookSecret: process.env.GOOGLE_FORM_WEBHOOK_SECRET || process.env.GOOGLE_SCRIPT_SECRET || 'bb-vision-x-gform-secret-2026',

  // Spatial search defaults
  defaultSearchRadiusKm: 25,
  maxSearchRadiusKm: 150,

  // CORS Allowed Origins
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173').split(',')
};

module.exports = config;
