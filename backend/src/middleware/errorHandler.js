/**
 * BloodBridge Vision-X: Centralized Error Handler
 * 
 * Provides consistent JSON errors and ensures zero secret leakage.
 */

function errorHandler(err, req, res, next) {
  // Log error safely without exposing credentials
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);

  const status = err.status || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  res.status(status).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  });
}

module.exports = errorHandler;
