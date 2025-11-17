# Ticket PDF Generation System

**Story:** 5.2 - PDF Ticket Generation
**Status:** ✅ Complete
**Last Updated:** 2025-11-17

## Overview

The ticket PDF generation system creates printable, scannable tickets for recital shows. Each ticket includes:
- Show details (name, date, time, venue)
- Seat information (section, row, seat number)
- Order and customer information
- QR code for validation at venue entrance
- Professional, branded layout

## Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│           Frontend (Vue Components)             │
│  - useTicketPdf() composable                   │
│  - Download/View ticket actions                 │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│              API Endpoints                      │
│  - POST /api/tickets/generate-pdf              │
│  - GET  /api/tickets/[id]/download             │
│  - GET  /api/tickets/[id]/pdf-url              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          Server Utilities                       │
│  - ticketPdf.ts (PDF generation)               │
│  - qrCode.ts (QR code generation)              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         Supabase Storage                        │
│  - ticket-pdfs bucket (public)                 │
│  - UUID-based filenames                         │
└─────────────────────────────────────────────────┘
```

## Files Created

### Server Utilities
- **`server/utils/ticketPdf.ts`** - Core PDF generation logic
  - `fetchTicketData(ticketId)` - Fetch complete ticket data from database
  - `generateTicketPDF(ticketData)` - Create PDF document using pdf-lib
  - `uploadTicketPDF(pdfBytes, ticketId)` - Upload to Supabase Storage
  - `updateTicketWithPDF(ticketId, pdfUrl)` - Update ticket record
  - `generateAndUploadTicketPDF(ticketId)` - Complete workflow
  - `getOrGenerateTicketPDF(ticketId)` - Get existing or generate new

### API Endpoints

#### POST /api/tickets/generate-pdf
```typescript
// Request
{
  ticketId: string // UUID
}

// Response
{
  success: true,
  data: {
    ticketId: string,
    pdfUrl: string,
    generatedAt: string
  }
}
```

**Purpose:** Manually trigger PDF generation for a specific ticket.

**Security:**
- ✅ Requires authentication (must be logged in)
- ✅ Requires authorization (must be ticket owner OR admin/staff)
- ✅ Uses scoped Supabase client (respects RLS)
- Returns 401 if not authenticated
- Returns 403 if not authorized

**Usage:**
```javascript
const { data } = await $fetch('/api/tickets/generate-pdf', {
  method: 'POST',
  body: { ticketId: 'uuid-here' }
})
```

#### GET /api/tickets/[id]/download
**Purpose:** Download ticket PDF file (generates if not exists)

**Security:**
- ✅ Requires authentication (must be logged in)
- ✅ Requires authorization (must be ticket owner OR admin/staff)
- ✅ Uses scoped Supabase client (respects RLS)
- Returns 401 if not authenticated
- Returns 403 if not authorized

**Response:** PDF file (application/pdf)

**Headers:**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="ticket-XXX.pdf"`

**Usage:**
```javascript
// Browser download
window.location.href = `/api/tickets/${ticketId}/download`

// Or using fetch
const response = await fetch(`/api/tickets/${ticketId}/download`)
const blob = await response.blob()
```

#### GET /api/tickets/[id]/pdf-url
```typescript
// Response
{
  success: true,
  data: {
    ticketId: string,
    pdfUrl: string
  }
}
```

**Purpose:** Get public URL for ticket PDF (generates if not exists)

**Security:**
- ✅ Requires authentication (must be logged in)
- ✅ Requires authorization (must be ticket owner OR admin/staff)
- ✅ Uses scoped Supabase client (respects RLS)
- Returns 401 if not authenticated
- Returns 403 if not authorized

**Usage:**
```javascript
const { data } = await $fetch(`/api/tickets/${ticketId}/pdf-url`)
console.log(data.pdfUrl) // https://...supabase.co/storage/.../ticket-pdfs/uuid.pdf
```

### Composable

**`composables/useTicketPdf.ts`** - Frontend utility for ticket PDF operations

```typescript
const {
  generateTicketPdf,          // Generate PDF, returns URL
  getTicketPdfUrl,            // Get URL (generates if needed)
  downloadTicketPdf,          // Trigger browser download
  generateAndDownloadTicketPdf, // Generate + download
  openTicketPdf,              // Open in new tab
  generateBulkTicketPdfs      // Bulk generation
} = useTicketPdf()
```

**Example Usage:**
```vue
<script setup>
const { downloadTicketPdf, openTicketPdf } = useTicketPdf()

const handleDownload = async (ticketId: string, ticketNumber: string) => {
  await downloadTicketPdf(ticketId, ticketNumber)
}

const handleView = async (ticketId: string) => {
  await openTicketPdf(ticketId)
}
</script>

<template>
  <Button
    label="Download Ticket"
    icon="pi pi-download"
    @click="handleDownload(ticket.id, ticket.ticket_number)"
  />
  <Button
    label="View Ticket"
    icon="pi pi-eye"
    @click="handleView(ticket.id)"
  />
</template>
```

### Database Migration

**`supabase/migrations/20251116_015_ticket_pdfs_storage.sql`**

Creates Supabase Storage bucket with RLS policies:

- **Bucket:** `ticket-pdfs` (public)
- **Read Policy:** Public (anyone with URL can download)
- **Write Policy:** Admin/staff only
- **Update Policy:** Admin/staff only
- **Delete Policy:** Admin only

**Security:**
- PDFs are named with UUIDs (not guessable)
- QR codes contain unique tokens
- Tickets can only be scanned once
- Public access allows email delivery without authentication

## PDF Layout

### Visual Design

```
┌─────────────────────────────────────────────────────┐
│ [Dark Blue Header]                                  │
│                                                     │
│ SHOW TITLE                                          │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Date & Time:    Saturday, December 14, 2025 at 7PM│
│                                                     │
│ Venue:          Grand Theater                      │
│                 123 Main St, Anytown, CA 12345     │
│                                                     │
│ ┌─────────────────────┐                           │
│ │ YOUR SEAT          │                    [QR]   │
│ │                     │                    [CODE]  │
│ │ Section: Orchestra  │                    [IMG]   │
│ │ Row: C             │                           │
│ │ Seat: 14           │                  Scan at   │
│ └─────────────────────┘                  entrance  │
│                                                     │
│ Ticket Number:  TKT-ABC123XYZ456-1234567890123     │
│ Order Number:   ORD-20251117-ABC123                │
│ Customer:       John Doe                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Present this ticket at the venue entrance for      │
│ admission. Please arrive 15 minutes before         │
│ showtime.                                          │
└─────────────────────────────────────────────────────┘
```

### Dimensions
- **Page Size:** 600x400 points (~8.33" x 5.56")
- **Margins:** 40 points
- **QR Code:** 150x150 points
- **Fonts:** Helvetica, Helvetica-Bold

### Colors
- **Primary:** Dark Blue (rgb(0.2, 0.2, 0.6))
- **Secondary:** Gray (rgb(0.4, 0.4, 0.4))
- **Background:** Light Gray (rgb(0.9, 0.9, 0.9))

## Data Flow

### 1. Ticket Purchase
```
Customer completes purchase
→ Ticket record created in database
→ QR code generated (Story 5.1)
→ PDF generation triggered (Story 5.2)
→ PDF uploaded to Supabase Storage
→ PDF URL saved to ticket record
→ Email sent with PDF link (Story 5.3)
```

### 2. PDF Generation Process

```typescript
generateAndUploadTicketPDF(ticketId)
  ↓
1. fetchTicketData(ticketId)
   - Join ticket → order → show → venue → seat
   - Get all display information
  ↓
2. generateTicketPDF(ticketData)
   - Create PDF document (pdf-lib)
   - Add show details
   - Add seat information
   - Generate QR code image
   - Embed QR code in PDF
   - Format layout
  ↓
3. uploadTicketPDF(pdfBytes, ticketId)
   - Upload to Supabase Storage
   - Return public URL
  ↓
4. updateTicketWithPDF(ticketId, pdfUrl)
   - Update ticket.pdf_url
   - Set ticket.pdf_generated_at
  ↓
Return PDF URL
```

### 3. PDF Retrieval

```typescript
getOrGenerateTicketPDF(ticketId)
  ↓
Check if PDF exists and is recent (<24 hours)
  ↓
  YES → Return existing PDF URL
  ↓
  NO  → Generate new PDF
        ↓
        Return new PDF URL
```

## Database Schema Updates

### tickets table
```sql
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ;
```

**Fields:**
- `pdf_url` - Supabase Storage public URL
- `pdf_generated_at` - Timestamp of last PDF generation

## Dependencies

### npm Packages (Already Installed)
- `pdf-lib` - PDF creation library
- `qrcode` - QR code generation
- `@types/qrcode` - TypeScript types

### Story Dependencies
- ✅ **Story 5.1:** QR Code Generation (required)
- ⏳ **Story 5.3:** Email Delivery (uses PDF URLs)

## Testing

### Manual Testing Steps

1. **Generate PDF via API:**
   ```bash
   curl -X POST http://localhost:3000/api/tickets/generate-pdf \
     -H "Content-Type: application/json" \
     -d '{"ticketId": "uuid-here"}'
   ```

2. **Download PDF:**
   ```bash
   curl http://localhost:3000/api/tickets/uuid-here/download \
     -o ticket.pdf
   ```

3. **Get PDF URL:**
   ```bash
   curl http://localhost:3000/api/tickets/uuid-here/pdf-url
   ```

### Frontend Testing

```vue
<script setup>
const { generateAndDownloadTicketPdf } = useTicketPdf()

// Test with a valid ticket ID
const testTicketId = 'your-ticket-uuid'
const testTicketNumber = 'TKT-TEST-123'

onMounted(async () => {
  await generateAndDownloadTicketPdf(testTicketId, testTicketNumber)
})
</script>
```

### Verification Checklist

- [ ] PDF contains correct show details
- [ ] PDF contains correct seat information
- [ ] PDF contains correct order/customer info
- [ ] QR code is scannable
- [ ] QR code contains ticket.qr_code value
- [ ] PDF uploads to Supabase Storage
- [ ] ticket.pdf_url is updated in database
- [ ] ticket.pdf_generated_at is set
- [ ] PDF is downloadable via public URL
- [ ] PDF renders correctly in PDF viewer
- [ ] Layout is visually appealing
- [ ] Text is readable and properly formatted

## Supabase Storage Setup

### Create Bucket (Manual Steps)

1. Go to Supabase Dashboard → Storage
2. Create new bucket:
   - **Name:** `ticket-pdfs`
   - **Public:** ✅ Yes
   - **File Size Limit:** 10 MB
   - **Allowed MIME types:** `application/pdf`

### Or Run Migration

```bash
# Run the migration
supabase db reset  # Dev environment
# or
supabase db push  # Production
```

The migration `20251116_015_ticket_pdfs_storage.sql` will:
- Create the `ticket-pdfs` bucket
- Set up RLS policies
- Configure public access

## Security Considerations

### Authentication & Authorization ✅
**All PDF endpoints are protected:**
- ✅ **Authentication required:** Must be logged in
- ✅ **Authorization required:** Must be ticket owner OR admin/staff
- ✅ **Row-Level Security (RLS):** Uses scoped Supabase client
- ❌ **No bypass:** Cannot access other users' tickets
- ✅ **Ownership verification:** Checks ticket order email matches user email

**Implementation:**
- Uses `requireTicketAccess()` helper function
- Throws 401 if not authenticated
- Throws 403 if not authorized (not owner/staff)
- All database queries use `serverSupabaseClient(event)` (respects RLS)
- Only storage operations use service key (no RLS on storage)

### Public Access
- PDFs are publicly accessible via direct URL (required for email delivery)
- Filenames are UUIDs (not guessable without authorization)
- QR codes are unique and one-time use
- Must be authenticated to get PDF URL in the first place

### Access Control
- ✅ Only ticket owners and admin/staff can generate PDFs
- ✅ Only ticket owners and admin/staff can download PDFs
- ✅ Only ticket owners and admin/staff can view PDF URLs
- ✅ Only admin/staff can upload PDFs to storage
- ✅ Only admin can delete PDFs from storage
- ✅ RLS policies enforced on all ticket/order queries

### Data Protection
- No sensitive payment info in PDFs
- Customer email/phone not displayed publicly
- QR codes validated server-side (Story 5.4)
- Database queries respect user ownership via RLS

## Performance Considerations

### Caching
- PDFs are regenerated if older than 24 hours
- Reduces storage costs for updated show info
- Fresh PDFs ensure accurate details

### File Size
- Average PDF size: ~50-100 KB
- QR code embedded as PNG: ~10 KB
- Efficient for email delivery

### Concurrent Generation
- Each ticket generates independently
- Bulk operations supported via composable
- No queue needed for current scale

## Future Enhancements

### Story 5.3: Email Delivery
- Attach PDF to order confirmation email
- Include download link in email body
- Send reminder emails with ticket link

### Story 5.4: Ticket Lookup
- Customer portal for ticket retrieval
- Download all tickets for an order
- Resend ticket emails

### Future Features (Post-MVP)
- Custom branding per show/series
- Multiple PDF templates
- Ticket wallet integration (Apple/Google Wallet)
- Bulk PDF generation for admin
- Print-at-home vs. mobile ticket options
- Accessibility features (large print, high contrast)

## Troubleshooting

### PDF Generation Fails

**Error:** `Ticket not found`
- **Cause:** Invalid ticket ID
- **Solution:** Verify ticket exists in database

**Error:** `Show not found`
- **Cause:** Ticket's show_id references non-existent show
- **Solution:** Check referential integrity in database

**Error:** `Failed to generate QR code`
- **Cause:** QR code buffer generation failed
- **Solution:** Check qrCode.ts utility, verify qrcode package installed

### PDF Upload Fails

**Error:** `Failed to upload PDF`
- **Cause:** Supabase Storage bucket not created
- **Solution:** Run migration or create bucket manually

**Error:** `Failed to get public URL`
- **Cause:** Bucket not set to public
- **Solution:** Enable public access in Supabase Dashboard

### PDF Download Fails

**Error:** `PDF file not found`
- **Cause:** File was deleted or never uploaded
- **Solution:** Regenerate PDF via generate-pdf endpoint

## API Reference

See [API Endpoints](#api-endpoints) section above for detailed API documentation.

## Related Documentation

- [QR Code Generation](./QR_CODE_GENERATION.md) - Story 5.1
- [Email Delivery](./EMAIL_DELIVERY.md) - Story 5.3 (upcoming)
- [Ticketing System Roadmap](./TICKETING_IMPLEMENTATION_ROADMAP.md)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review related stories documentation
3. Contact development team

---

**Implementation Status:** ✅ Complete
**Next Story:** 5.3 - Email Delivery
