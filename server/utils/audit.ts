import type { H3Event } from 'h3'
import { getSupabaseClient } from './supabase'
import { logInfo, logError } from './logger'

/**
 * Audit Trail Utility
 *
 * Logs sensitive operations and user actions to the audit_logs table
 * for compliance, security investigations, and debugging.
 *
 * Features:
 * - Automatic user context extraction
 * - IP address and user agent capture
 * - Request ID correlation
 * - Flexible metadata storage
 */

export interface AuditLogEntry {
  action: string
  resourceType: string
  resourceId?: string
  metadata?: Record<string, any>
  status?: 'success' | 'failure' | 'partial'
  errorMessage?: string
}

/**
 * Log an audit entry for a user action
 *
 * @param event - H3 event object (for user context)
 * @param entry - Audit log entry details
 *
 * @example
 * await logAudit(event, {
 *   action: 'order.refund',
 *   resourceType: 'order',
 *   resourceId: orderId,
 *   metadata: {
 *     amount_in_cents: 5000,
 *     reason: 'customer_request',
 *     refund_type: 'full'
 *   }
 * })
 */
export async function logAudit(event: H3Event, entry: AuditLogEntry): Promise<void> {
  try {
    const client = getSupabaseClient()

    // Extract user context from event
    let userId: string | undefined
    let userEmail: string | undefined
    let userName: string | undefined
    let userRole: string | undefined
    let studioId: string | undefined

    // Try to get user from Supabase session
    try {
      const user = event.context.user
      if (user) {
        userId = user.id
        userEmail = user.email
      }

      const profile = event.context.profile
      if (profile) {
        userName = profile.full_name || `${profile.first_name} ${profile.last_name}`.trim()
        userRole = profile.user_role
        studioId = profile.studio_id
      }
    } catch (err) {
      // Ignore errors getting user context
    }

    // Extract request metadata
    const ipAddress = getRequestHeader(event, 'x-forwarded-for') ||
                      getRequestHeader(event, 'x-real-ip') ||
                      event.node.req.socket.remoteAddress
    const userAgent = getRequestHeader(event, 'user-agent')
    const requestId = event.context.requestId

    // Insert audit log
    const { error } = await client.from('audit_logs').insert({
      studio_id: studioId,
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      user_role: userRole,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      metadata: entry.metadata || {},
      ip_address: ipAddress,
      user_agent: userAgent,
      request_id: requestId,
      status: entry.status || 'success',
      error_message: entry.errorMessage,
    })

    if (error) {
      // Log error but don't fail the operation
      logError(new Error('Failed to write audit log'), {
        context: 'audit_log_write',
        action: entry.action,
        error,
      })
    } else {
      // Log successful audit write to application logs
      logInfo('Audit log recorded', {
        context: 'audit_log',
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        user_id: userId,
        request_id: requestId,
      })
    }
  } catch (error: any) {
    // Never throw from audit logging - it should not break the main operation
    logError(error, {
      context: 'audit_log_exception',
      action: entry.action,
    })
  }
}

/**
 * Common audit actions for easy reference
 */
export const AuditActions = {
  // Order operations
  ORDER_REFUND: 'order.refund',
  ORDER_CANCEL: 'order.cancel',
  ORDER_MODIFY: 'order.modify',

  // User operations
  USER_ROLE_CHANGE: 'user.role_change',
  USER_DELETE: 'user.delete',
  USER_SUSPEND: 'user.suspend',
  USER_RESTORE: 'user.restore',

  // Seat operations
  SEAT_OVERRIDE: 'seat.override',
  SEAT_RELEASE: 'seat.release',
  SEAT_RESERVE: 'seat.reserve',

  // Ticket operations
  TICKET_CANCEL: 'ticket.cancel',
  TICKET_TRANSFER: 'ticket.transfer',
  TICKET_RESEND: 'ticket.resend',

  // Payment operations
  PAYMENT_PROCESS: 'payment.process',
  PAYMENT_REFUND: 'payment.refund',
  PAYMENT_VOID: 'payment.void',

  // Settings operations
  SETTINGS_CHANGE: 'settings.change',
  STUDIO_PROFILE_UPDATE: 'studio.profile_update',

  // Data operations
  DATA_EXPORT: 'data.export',
  DATA_IMPORT: 'data.import',
  DATA_DELETE: 'data.delete',

  // Email operations
  EMAIL_SEND: 'email.send',
  EMAIL_BULK_SEND: 'email.bulk_send',

  // Report operations
  REPORT_GENERATE: 'report.generate',
  REPORT_EXPORT: 'report.export',
} as const

/**
 * Resource types for audit logs
 */
export const AuditResourceTypes = {
  ORDER: 'order',
  TICKET: 'ticket',
  USER: 'user',
  PROFILE: 'profile',
  SEAT: 'seat',
  PAYMENT: 'payment',
  STUDENT: 'student',
  CLASS: 'class',
  RECITAL: 'recital',
  SHOW: 'show',
  STUDIO: 'studio',
  EMAIL: 'email',
  REPORT: 'report',
} as const

/**
 * Helper function to log a successful audit entry
 */
export async function logAuditSuccess(
  event: H3Event,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  return logAudit(event, {
    action,
    resourceType,
    resourceId,
    metadata,
    status: 'success',
  })
}

/**
 * Helper function to log a failed audit entry
 */
export async function logAuditFailure(
  event: H3Event,
  action: string,
  resourceType: string,
  errorMessage: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  return logAudit(event, {
    action,
    resourceType,
    resourceId,
    metadata,
    status: 'failure',
    errorMessage,
  })
}
