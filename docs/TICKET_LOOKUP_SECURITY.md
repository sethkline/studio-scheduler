# Ticket Lookup Security Model

## Overview

The public ticket lookup feature allows customers to view their orders and download tickets without authentication. This document describes the security measures in place to protect customer data.

## Security Architecture

### Multi-Layer Security

1. **RLS Policies (Database Layer)**
   - Anonymous users have SELECT access to `ticket_orders`, `tickets`, and `show_seats`
   - Policies are intentionally permissive at the DB level
   - Security is enforced at the application layer

2. **Email Verification (API Layer)**
   - All public endpoints require email parameter
   - Email is verified against order owner before returning data
   - Case-insensitive email matching

3. **RLS-Aware Client Usage**
   - Uses `serverSupabaseClient(event)` for all queries
   - Service client only used for operations requiring elevated permissions (email sending, PDF generation)
   - Service client usage is protected by prior email verification

## API Endpoints

### GET `/api/public/orders/lookup?email={email}`

**Purpose:** Find all orders for a given email address

**Security:**
- Requires `email` query parameter
- Returns only orders matching the provided email
- Uses RLS-aware client
- No authentication required

**Attack Vectors:**
- Email enumeration: Attacker could check if an email has orders
- Mitigation: Generic error messages, rate limiting (recommended), same response time for found/not found

### GET `/api/public/orders/{id}?email={email}`

**Purpose:** Get detailed information about a specific order

**Security:**
- Requires `email` query parameter
- Verifies email matches order owner (403 if mismatch)
- Uses RLS-aware client
- No authentication required

**Attack Vectors:**
- Order ID enumeration: Attacker could guess order IDs
- Mitigation: Requires matching email to view order details
- UUIDs make enumeration difficult

### POST `/api/public/orders/{id}/resend-email`

**Purpose:** Resend confirmation email for an order

**Security:**
- Requires `email` in request body
- Verifies email matches order owner (403 if mismatch)
- Verifies order status is 'paid'
- Uses RLS-aware client for verification
- Uses service client for email operations (safe after verification)

**Attack Vectors:**
- Email spam: Attacker could resend emails to arbitrary addresses
- Mitigation: Email must match order owner, rate limiting (recommended)

## Security Best Practices

### What We Do

✅ Use `serverSupabaseClient(event)` with RLS for all queries
✅ Verify email ownership before returning sensitive data
✅ Use service client only after email verification
✅ Case-insensitive email matching
✅ Proper error codes (401, 403, 404)
✅ Generic error messages to prevent information disclosure

### Recommended Additional Measures

⚠️ **Rate Limiting:** Add rate limiting to prevent:
- Email enumeration attacks
- Order ID enumeration attacks
- Email spam via resend endpoint

⚠️ **Logging & Monitoring:** Log all access attempts for:
- Suspicious patterns (rapid order ID attempts)
- Failed email verification attempts
- Unusual resend email patterns

⚠️ **CAPTCHA:** Consider adding CAPTCHA to:
- Email lookup form
- Resend email button

## Data Exposure

### What Is Exposed (with valid email)

- Order number
- Customer name
- Customer email (already known)
- Customer phone number
- Order status
- Total amount
- Show details (name, date, time)
- Venue details (name, address)
- Ticket details (seat numbers, prices)
- QR codes (for ticket validation)

### What Is NOT Exposed

- Payment intent IDs (not returned in public endpoints)
- Stripe customer IDs
- Internal database IDs (returned but not sensitive)
- Other customers' data
- Admin/staff information

## RLS Policy Rationale

### Why Permissive RLS + App-Layer Verification?

**Alternative 1: Restrictive RLS**
- Would require complex RLS policies checking email via query parameters
- PostgreSQL RLS doesn't have access to HTTP request parameters
- Would need to pass email through every query, complex to maintain

**Alternative 2: Service Client Only**
- Bypasses all RLS protections
- More vulnerable to application-layer bugs
- Harder to audit and verify security

**Our Approach: Permissive RLS + App Verification**
- Clear separation of concerns
- RLS provides base protection
- Application layer enforces business rules
- Easier to audit and test
- Allows for future enhancements (e.g., time-limited access tokens)

## Testing Security

### Manual Security Tests

1. **Email Verification Test**
   ```bash
   # Should fail with 403
   curl "https://api.example.com/api/public/orders/{order_id}?email=wrong@email.com"

   # Should succeed
   curl "https://api.example.com/api/public/orders/{order_id}?email=correct@email.com"
   ```

2. **Missing Email Test**
   ```bash
   # Should fail with 401
   curl "https://api.example.com/api/public/orders/{order_id}"
   ```

3. **Case Sensitivity Test**
   ```bash
   # Should succeed (case-insensitive)
   curl "https://api.example.com/api/public/orders/{order_id}?email=USER@EMAIL.COM"
   curl "https://api.example.com/api/public/orders/{order_id}?email=user@email.com"
   ```

### Automated Security Tests

Consider adding tests for:
- Email verification enforcement
- Case-insensitive email matching
- Error message consistency
- RLS policy effectiveness
- Service client usage audit

## Future Enhancements

### Recommended Improvements

1. **Time-Limited Access Tokens**
   - Generate unique tokens for each order
   - Include in confirmation emails
   - Expire after reasonable period (e.g., 1 year)
   - Remove need for email parameter

2. **Rate Limiting**
   - Per-IP rate limiting on lookup endpoint
   - Per-email rate limiting on resend endpoint
   - CAPTCHA after multiple failed attempts

3. **Audit Logging**
   - Log all order access attempts
   - Track email verification failures
   - Monitor for suspicious patterns

4. **Two-Factor Verification**
   - SMS verification code
   - Email verification code
   - For high-value orders

## Compliance Considerations

### GDPR

- Customers can view their own data (Right to Access)
- No authentication required (reduces friction)
- Consider adding data export feature
- Consider adding data deletion request feature

### PCI DSS

- No payment card data is exposed
- Payment intent IDs are not returned
- No sensitive authentication data exposed

## Contact

For security concerns or to report vulnerabilities, please contact:
- Security Team: security@example.com
- Do not disclose vulnerabilities publicly

---

**Last Updated:** 2025-11-17
**Version:** 1.0
**Owner:** Development Team
