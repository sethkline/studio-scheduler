# Observability Guide

This document describes the structured logging and audit trail systems implemented in the Studio Scheduler application.

## Overview

The application uses a comprehensive observability stack to track:
- **Request/Response Logs**: HTTP requests with timing and context
- **Application Logs**: Structured logs from API handlers and services
- **Audit Logs**: Immutable trail of sensitive operations
- **Error Tracking**: Detailed error logging with stack traces
- **Performance Monitoring**: Slow query and request detection

## Structured Logging

### Log Format

All logs are structured JSON in production for easy parsing and searching. In development, logs are pretty-printed for readability.

**Production Log Format:**
```json
{
  "level": "info",
  "time": "2025-11-19T12:34:56.789Z",
  "service": "studio-scheduler",
  "environment": "production",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "studio_id": "789e4567-e89b-12d3-a456-426614174000",
  "msg": "Order refund processed successfully"
}
```

**Development Log Format:**
```
[12:34:56] INFO (studio-scheduler): Order refund processed successfully
    request_id: "550e8400-e29b-41d4-a716-446655440000"
    user_id: "123e4567-e89b-12d3-a456-426614174000"
    studio_id: "789e4567-e89b-12d3-a456-426614174000"
```

### Log Levels

- **`debug`**: Verbose diagnostic information (development only)
- **`info`**: General informational messages
- **`warn`**: Warning messages (non-critical issues)
- **`error`**: Error messages with stack traces

### Using the Logger

```typescript
import { logInfo, logError, logWarning } from '~/server/utils/logger'

// Info logging
logInfo('User login successful', {
  user_id: userId,
  ip_address: ipAddress,
})

// Error logging
logError(error, {
  context: 'payment_processing',
  order_id: orderId,
  amount: amount,
})

// Warning logging
logWarning('Slow database query detected', {
  query: 'SELECT * FROM orders',
  duration_ms: 2500,
})
```

### Request Context

Every HTTP request gets a unique `request_id` that's automatically included in all logs during that request. This allows you to trace a request through the entire system.

```typescript
// Access logger from event context (includes request_id)
export default defineEventHandler(async (event) => {
  const logger = event.context.logger
  logger.info('Processing order')
  // Logs will include request_id automatically
})
```

### Sensitive Data Redaction

The following fields are automatically redacted from logs:
- `password`
- `token`
- `authorization`
- `cookie`
- `stripe_secret`
- `api_key`

## Audit Logs

### What Gets Audited

Audit logs capture **who did what when** for sensitive operations:

- **Order Operations**: Refunds, cancellations, modifications
- **User Management**: Role changes, deletions, suspensions
- **Seat Operations**: Overrides, manual reservations
- **Ticket Operations**: Cancellations, transfers, resends
- **Payment Operations**: Processing, refunds, voids
- **Settings Changes**: Studio profile updates, configuration changes
- **Data Operations**: Exports, imports, bulk deletions

### Audit Log Schema

```typescript
{
  id: UUID
  studio_id: UUID
  user_id: UUID
  user_email: string
  user_name: string
  user_role: string
  action: string              // e.g., 'order.refund'
  resource_type: string       // e.g., 'order'
  resource_id: UUID
  metadata: JSONB             // Action-specific data
  ip_address: string
  user_agent: string
  request_id: string          // Correlates with app logs
  status: 'success' | 'failure' | 'partial'
  error_message: string
  created_at: timestamp
}
```

### Creating Audit Logs

```typescript
import { logAudit, AuditActions, AuditResourceTypes } from '~/server/utils/audit'

export default defineEventHandler(async (event) => {
  // ... perform sensitive operation ...

  // Log successful operation
  await logAudit(event, {
    action: AuditActions.ORDER_REFUND,
    resourceType: AuditResourceTypes.ORDER,
    resourceId: orderId,
    metadata: {
      amount_in_cents: 5000,
      refund_type: 'full',
      reason: 'customer_request',
    },
    status: 'success',
  })
})
```

### Viewing Audit Logs

**Admin UI**: Navigate to `/admin/audit-logs` to view and filter audit logs

**API**: Query audit logs programmatically
```bash
GET /api/admin/audit-logs?action=order.refund&from_date=2025-11-01
```

**Database Query**:
```sql
SELECT * FROM audit_logs
WHERE action = 'order.refund'
  AND created_at >= '2025-11-01'
ORDER BY created_at DESC;
```

## Performance Monitoring

### Slow Request Detection

Requests taking longer than 3 seconds are automatically logged as warnings:

```json
{
  "level": "warn",
  "type": "slow_request",
  "path": "/api/orders",
  "method": "POST",
  "duration_ms": 3500,
  "msg": "Slow request detected: POST /api/orders (3500ms)"
}
```

### Slow Query Detection

Database queries taking longer than 1 second should be logged:

```typescript
import { logSlowQuery } from '~/server/utils/logger'

const startTime = Date.now()
const { data } = await client.from('orders').select('*')
const duration = Date.now() - startTime

if (duration > 1000) {
  logSlowQuery('SELECT * FROM orders', duration, {
    order_count: data?.length,
  })
}
```

## Querying Logs

### By Request ID

Find all logs for a specific request:

**Application Logs**:
```bash
# Development (grep logs)
grep "550e8400-e29b-41d4-a716-446655440000" logs/app.log

# Production (if using log aggregation service)
# Search for: request_id:"550e8400-e29b-41d4-a716-446655440000"
```

**Audit Logs**:
```sql
SELECT * FROM audit_logs
WHERE request_id = '550e8400-e29b-41d4-a716-446655440000';
```

### By User

Find all actions by a specific user:

```sql
SELECT
  action,
  resource_type,
  resource_id,
  metadata,
  created_at
FROM audit_logs
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY created_at DESC
LIMIT 100;
```

### By Resource

Find all actions on a specific resource:

```sql
SELECT * FROM get_resource_audit_trail('order', '789e4567-e89b-12d3-a456-426614174000');
```

## Data Retention

### Application Logs

- **Development**: Logs rotate daily, kept for 7 days
- **Production**: Logs sent to external service (configure retention there)

### Audit Logs

- **Retention Period**: 365 days (configurable)
- **Cleanup**: Run cleanup function to remove old logs

```sql
-- Clean up audit logs older than 365 days
SELECT cleanup_old_audit_logs(365);
```

## Environment Variables

```bash
# Log level (debug, info, warn, error)
LOG_LEVEL=info

# External error tracking service (optional)
SENTRY_DSN=https://...
```

## Best Practices

### DO:
- ✅ Use structured logging with context fields
- ✅ Include request_id in all logs
- ✅ Log all sensitive operations to audit trail
- ✅ Use appropriate log levels
- ✅ Include enough context to debug issues
- ✅ Log both success and failure for audit actions

### DON'T:
- ❌ Log sensitive data (passwords, tokens, API keys)
- ❌ Use console.log/error directly
- ❌ Log inside tight loops (performance impact)
- ❌ Throw exceptions from audit logging
- ❌ Delete audit logs manually

## Troubleshooting

### Logs not appearing

1. Check `LOG_LEVEL` environment variable
2. Ensure logger is imported correctly
3. Verify pino is installed: `npm list pino`

### Request ID missing

The logging middleware must run before your handler. Ensure middleware is in `/server/middleware/` directory.

### Audit logs not saving

1. Check database migration has run: `audit_logs` table exists
2. Verify RLS policies allow service role to insert
3. Check application logs for audit write errors

## Integration with External Services

### Sentry (Error Tracking)

Add to `server/utils/logger.ts`:

```typescript
import * as Sentry from '@sentry/node'

export function logError(error: Error, context: Record<string, any> = {}) {
  logger.error({ err: error, stack: error.stack, ...context }, error.message)

  // Also send to Sentry
  Sentry.captureException(error, {
    extra: context,
  })
}
```

### DataDog / CloudWatch / etc.

Configure pino transport to send logs to your service:

```typescript
const logger = pino({
  transport: {
    target: 'pino-datadog',
    options: {
      apiKey: process.env.DATADOG_API_KEY,
    },
  },
})
```

## Related Documentation

- [Investigating Issues Runbook](./runbooks/investigating-issues.md)
- [Database Schema](./database/)
- [API Documentation](./api/)
