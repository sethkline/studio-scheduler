import pino from 'pino'

/**
 * Structured logger configuration for the application
 *
 * Features:
 * - JSON logging in production for machine parsing
 * - Pretty printing in development for human readability
 * - Request ID tracing across logs
 * - Context fields: studio_id, user_id, request_id
 * - Multiple log levels: debug, info, warn, error
 */

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development'

// Create base logger with appropriate configuration
const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Base fields included in every log
  base: {
    service: 'studio-scheduler',
    environment: process.env.NODE_ENV || 'development',
  },

  // Timestamp configuration
  timestamp: pino.stdTimeFunctions.isoTime,

  // Pretty print in development, JSON in production
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,

  // Redact sensitive fields from logs
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'cookie',
      'stripe_secret',
      'api_key',
      '*.password',
      '*.token',
      '*.authorization',
    ],
    remove: true,
  },
})

/**
 * Creates a child logger with additional context
 * @param context - Additional fields to include in all logs from this logger
 * @returns Child logger instance
 */
export function createLogger(context: Record<string, any> = {}) {
  return logger.child(context)
}

/**
 * Creates a request-scoped logger with request context
 * @param requestId - Unique request identifier
 * @param userId - User ID if authenticated
 * @param studioId - Studio ID if available
 * @param additionalContext - Any other context to include
 * @returns Child logger instance with request context
 */
export function createRequestLogger(
  requestId: string,
  userId?: string,
  studioId?: string,
  additionalContext: Record<string, any> = {}
) {
  return logger.child({
    request_id: requestId,
    user_id: userId,
    studio_id: studioId,
    ...additionalContext,
  })
}

/**
 * Log an error with full stack trace and context
 * @param error - Error object
 * @param context - Additional context
 */
export function logError(error: Error, context: Record<string, any> = {}) {
  logger.error(
    {
      err: error,
      stack: error.stack,
      ...context,
    },
    error.message
  )
}

/**
 * Log a warning
 * @param message - Warning message
 * @param context - Additional context
 */
export function logWarning(message: string, context: Record<string, any> = {}) {
  logger.warn(context, message)
}

/**
 * Log an info message
 * @param message - Info message
 * @param context - Additional context
 */
export function logInfo(message: string, context: Record<string, any> = {}) {
  logger.info(context, message)
}

/**
 * Log a debug message (only in development or when LOG_LEVEL=debug)
 * @param message - Debug message
 * @param context - Additional context
 */
export function logDebug(message: string, context: Record<string, any> = {}) {
  logger.debug(context, message)
}

/**
 * Log a slow query for performance monitoring
 * @param query - Query description
 * @param durationMs - Query duration in milliseconds
 * @param context - Additional context
 */
export function logSlowQuery(
  query: string,
  durationMs: number,
  context: Record<string, any> = {}
) {
  logger.warn(
    {
      type: 'slow_query',
      query,
      duration_ms: durationMs,
      ...context,
    },
    `Slow query detected: ${query} (${durationMs}ms)`
  )
}

/**
 * Log a slow API request for performance monitoring
 * @param path - Request path
 * @param method - HTTP method
 * @param durationMs - Request duration in milliseconds
 * @param context - Additional context
 */
export function logSlowRequest(
  path: string,
  method: string,
  durationMs: number,
  context: Record<string, any> = {}
) {
  logger.warn(
    {
      type: 'slow_request',
      path,
      method,
      duration_ms: durationMs,
      ...context,
    },
    `Slow request detected: ${method} ${path} (${durationMs}ms)`
  )
}

// Export the base logger as default
export default logger
