const app = require('./app');
const config = require('./config');
const { initDb } = require('./db/db');

async function startServer() {
  try {
    // Initialize database connection and schemas
    await initDb();

    const server = app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(` BloodBridge Vision-X API Server is running`);
      console.log(` Port: ${config.port} | Mode: ${config.nodeEnv}`);
      console.log(` Health: http://localhost:${config.port}/api/health`);
      console.log(` Groq Model: ${config.groqModel}`);
      console.log(`=======================================================`);
    });

    // Graceful shutdown
    const handleShutdown = (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('Server closed. Process terminating.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (err) {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  }
}

startServer();
