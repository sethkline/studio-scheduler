import { randomUUID } from 'crypto'
import { createRequestLogger, logSlowRequest } from '../utils/logger'
import type { H3Event } from 'h3'

/**
 * Logging middleware for HTTP requests
 *
 * Features:
 * - Generates unique request_id for each request
 * - Logs request start with method, path, user context
 * - Logs request end with status code and duration
 * - Detects slow requests (>3000ms)
 * - Adds request_id to event.context for use in handlers
 */

// Threshold for slow request warnings (in milliseconds)
const SLOW_REQUEST_THRESHOLD = 3000

export default defineEventHandler(async (event: H3Event) => {
  // Generate unique request ID
  const requestId = randomUUID()

  // Extract request metadata
  const method = event.method
  const path = event.path
  const startTime = Date.now()

  // Try to get user context from session
  let userId: string | undefined
  let studioId: string | undefined

  try {
    // Attempt to get user from Supabase session
    const user = event.context.user
    if (user) {
      userId = user.id
    }

    // Attempt to get studio_id from user profile or context
    // This will be populated after authentication middleware runs
    const profile = event.context.profile
    if (profile?.studio_id) {
      studioId = profile.studio_id
    }
  } catch (error) {
    // Ignore errors getting user context
    // This is expected for unauthenticated requests
  }

  // Get client IP and user agent
  const ip = getRequestHeader(event, 'x-forwarded-for') ||
             getRequestHeader(event, 'x-real-ip') ||
             event.node.req.socket.remoteAddress
  const userAgent = getRequestHeader(event, 'user-agent')

  // Create request-scoped logger
  const logger = createRequestLogger(requestId, userId, studioId, {
    ip,
    user_agent: userAgent,
  })

  // Store request_id and logger in event context for use in handlers
  event.context.requestId = requestId
  event.context.logger = logger

  // Log request start
  logger.info({
    type: 'request_start',
    method,
    path,
  }, `${method} ${path}`)

  // Execute the request handler
  let statusCode: number | undefined
  let error: Error | undefined

  try {
    const response = await event.handler(event)

    // Try to extract status code from response
    statusCode = event.node.res.statusCode || 200

    return response
  } catch (err) {
    // Capture error for logging
    error = err as Error
    statusCode = event.node.res.statusCode || 500
    throw err // Re-throw to let error handling continue
  } finally {
    // Calculate request duration
    const duration = Date.now() - startTime

    // Log request completion
    const logData = {
      type: 'request_end',
      method,
      path,
      status_code: statusCode,
      duration_ms: duration,
    }

    if (error) {
      logger.error({
        ...logData,
        error: error.message,
        stack: error.stack,
      }, `${method} ${path} - ${statusCode} (${duration}ms) - ERROR: ${error.message}`)
    } else if (statusCode && statusCode >= 500) {
      logger.error(logData, `${method} ${path} - ${statusCode} (${duration}ms) - Server Error`)
    } else if (statusCode && statusCode >= 400) {
      logger.warn(logData, `${method} ${path} - ${statusCode} (${duration}ms) - Client Error`)
    } else {
      logger.info(logData, `${method} ${path} - ${statusCode} (${duration}ms)`)
    }

    // Detect and log slow requests
    if (duration > SLOW_REQUEST_THRESHOLD) {
      logSlowRequest(path, method, duration, {
        request_id: requestId,
        user_id: userId,
        studio_id: studioId,
        status_code: statusCode,
      })
    }
  }
})
