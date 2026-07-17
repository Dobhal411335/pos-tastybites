/**
 * Centralized Configuration for the Logger
 */
export const loggerConfig = {
  // Redact sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'jwt',
      'otp',
      'accessToken',
      'refreshToken',
      '*.password',
      '*.token',
      '*.otp'
    ],
    censor: '[REDACTED]'
  },
  // Log level based on environment
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  logFilePath: './logs/app.log'
};
