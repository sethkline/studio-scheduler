# Ticketing System - Feature Stories Breakdown

**Generated:** 2025-11-16
**Last Updated:** 2025-11-17
**Based on:** TICKETING_IMPLEMENTATION_ROADMAP.md
**Status:** Phases 1-5 Complete ✅ | Phase 6 Partial (6.1 ✅) | Phases 6.2-7 Remaining

---

## Story Dependency Map

```
Phase 1 (✅ COMPLETE)
    ↓
Phase 2 (✅ COMPLETE - Admin Seat Map Builder)
    ├── Story 2.1: Venue Management ✅
    ├── Story 2.2: Section & Price Zone Management ✅
    ├── Story 2.3: Seat Map Builder UI ✅
    └── Story 2.4: CSV Import ✅
    ↓
Phase 3 (✅ COMPLETE - Show Configuration)
    ├── Story 3.1: Show-Venue Linking ✅
    └── Story 3.2: Seat Generation ✅
    ↓
Phase 4 (✅ COMPLETE - Public Purchase Flow)
    ├── Story 4.1: Public Seat Viewing ✅
    ├── Story 4.2: Seat Selection & Reservation ✅
    ├── Story 4.3: Real-time Updates ✅
    └── Story 4.4: Checkout Flow ✅
    ↓
Phase 5 (✅ COMPLETE - Ticket Generation)
    ├── Story 5.1: QR Code Generation ✅
    ├── Story 5.2: PDF Generation ✅
    ├── Story 5.3: Email Delivery ✅
    └── Story 5.4: Ticket Lookup ✅
    ↓
Phase 6 (⚠️ PARTIAL - Admin Management)
    ├── Story 6.1: Order List & Search ✅ COMPLETE
    ├── Story 6.2: Dashboard & Analytics ❌ TODO
    ├── Story 6.3: Refund Processing ❌ TODO
    └── Story 6.4: Reports ❌ TODO
    ↓
Phase 7 (❌ TODO - Testing & Polish)
    └── All stories from Phases 2-6
```

---

## PHASE 2: Admin Seat Map Builder (Weeks 3-4)

### Story 2.1: Venue Management CRUD ✅ COMPLETE
**Priority:** P0 (Critical - Blocks everything)
**Effort:** 2 days
**Dependencies:** None (Database complete ✅)
**Status:** ✅ COMPLETE

**Description:**
Create basic venue management pages for admins to create, edit, and delete venues.

**Acceptance Criteria:**
- [x] Admin can view list of all venues
- [x] Admin can create new venue with name, address, capacity
- [x] Admin can edit venue details
- [x] Admin can delete venue (with confirmation)
- [x] Venue form validates required fields
- [x] Shows proper error messages

**Technical Tasks:**
- [x] Create page: `/pages/admin/ticketing/venues/index.vue`
- [x] Create page: `/pages/admin/ticketing/venues/create.vue`
- [x] Create page: `/pages/admin/ticketing/venues/[id]/edit.vue`
- [x] Create composable: `composables/useVenues.ts`
- [x] Create API: `GET /api/venues`
- [x] Create API: `POST /api/venues`
- [x] Create API: `GET /api/venues/[id]`
- [x] Create API: `PUT /api/venues/[id]`
- [x] Create API: `DELETE /api/venues/[id]`

**Files to Create:**
```
/pages/admin/ticketing/venues/
  ├── index.vue
  ├── create.vue
  └── [id]/
      └── edit.vue
/composables/useVenues.ts
/server/api/venues/
  ├── index.get.ts
  ├── index.post.ts
  ├── [id].get.ts
  ├── [id].put.ts
  └── [id].delete.ts
```

**Parallel Work:** None (must complete first)

---

### Story 2.2: Section & Price Zone Management
**Priority:** P0 (Critical - Blocks seat map)
**Effort:** 1.5 days
**Dependencies:** Story 2.1
**Can Start:** After 2.1 complete

**Description:**
Add ability to create and manage venue sections (Orchestra, Balcony) and price zones within the venue edit page.

**Acceptance Criteria:**
- [ ] Admin can create sections within a venue
- [ ] Admin can reorder sections (display_order)
- [ ] Admin can create price zones with name, price, color
- [ ] Admin can edit/delete sections and price zones
- [ ] Price zone colors display in UI preview
- [ ] Cannot delete section/zone if seats exist

**Technical Tasks:**
- [ ] Add section manager to venue edit page
- [ ] Add price zone manager to venue edit page
- [ ] Create API: `POST /api/venues/[id]/sections`
- [ ] Create API: `PUT /api/venues/[id]/sections/[sectionId]`
- [ ] Create API: `DELETE /api/venues/[id]/sections/[sectionId]`
- [ ] Create API: `POST /api/venues/[id]/price-zones`
- [ ] Create API: `PUT /api/venues/[id]/price-zones/[zoneId]`
- [ ] Create API: `DELETE /api/venues/[id]/price-zones/[zoneId]`

**Components:**
```
/components/venue/
  ├── SectionManager.vue
  ├── PriceZoneManager.vue
  └── PriceZoneColorPicker.vue
```

**Parallel Work:** Can work on Story 5.1 (QR Code) in parallel

---

### Story 2.3: Visual Seat Map Builder
**Priority:** P0 (Critical - Core feature)
**Effort:** 4 days
**Dependencies:** Story 2.2
**Can Start:** After 2.2 complete

**Description:**
Build visual drag-and-drop seat map editor with canvas, zoom/pan, and seat placement.

**Acceptance Criteria:**
- [ ] Visual canvas displays seat layout
- [ ] Can zoom/pan the canvas
- [ ] Can add rows (with auto seat numbering)
- [ ] Can add individual seats
- [ ] Can drag to reposition seats
- [ ] Can assign price zone to seats
- [ ] Can mark seats as ADA/blocked/house
- [ ] Can delete seats
- [ ] Seat colors match price zones
- [ ] Can save seat map to database
- [ ] Can undo/redo changes
- [ ] Preview mode (read-only view)

**Technical Tasks:**
- [ ] Create page: `/pages/admin/ticketing/venues/[id]/seat-map.vue`
- [ ] Create component: `SeatMapBuilder.vue` (main canvas)
- [ ] Create component: `BuilderToolbar.vue` (tools)
- [ ] Create component: `BuilderCanvas.vue` (drawing area)
- [ ] Create component: `SeatNode.vue` (individual seat)
- [ ] Create component: `SectionNode.vue` (section container)
- [ ] Create store: `stores/seatMapBuilder.ts`
- [ ] Create API: `GET /api/venues/[id]/seat-map`
- [ ] Create API: `POST /api/venues/[id]/seat-map` (bulk save)
- [ ] Create API: `POST /api/venues/[id]/seats` (create seat)
- [ ] Create API: `PUT /api/venues/[id]/seats/[seatId]` (update seat)
- [ ] Create API: `DELETE /api/venues/[id]/seats/[seatId]` (delete seat)

**Components:**
```
/components/seat-map-builder/
  ├── SeatMapBuilder.vue
  ├── BuilderToolbar.vue
  ├── BuilderCanvas.vue
  ├── SeatNode.vue
  ├── SectionNode.vue
  └── PriceZonePanel.vue
```

**Parallel Work:** Can work on Stories 3.1, 5.1 in parallel

---

### Story 2.4: CSV Seat Import
**Priority:** P1 (Important - Time saver)
**Effort:** 1 day
**Dependencies:** Story 2.3
**Can Start:** After 2.3 complete

**Description:**
Add CSV import functionality to bulk create seats from spreadsheet.

**Acceptance Criteria:**
- [ ] Admin can upload CSV file
- [ ] CSV validates column headers
- [ ] Shows preview before import
- [ ] Imports seats in bulk
- [ ] Shows success/error summary
- [ ] Handles duplicate seat numbers

**CSV Format:**
```csv
section_name,row_name,seat_number,seat_type,price_zone_name,x_position,y_position
Orchestra,A,1,regular,Premium,100,100
Orchestra,A,2,regular,Premium,120,100
```

**Technical Tasks:**
- [ ] Create component: `ImportCSV.vue`
- [ ] Create API: `POST /api/venues/[id]/seat-map/import-csv`
- [ ] Add CSV parsing logic
- [ ] Add validation logic

**Parallel Work:** Can work on Stories 3.1, 3.2, 5.1, 5.2 in parallel

---

## PHASE 3: Show Configuration & Seat Generation (Week 5)

### Story 3.1: Show-Venue Linking
**Priority:** P0 (Critical - Blocks seat generation)
**Effort:** 1 day
**Dependencies:** Story 2.1
**Can Start:** After 2.1 complete (can run in parallel with 2.2, 2.3)

**Description:**
Add venue selection to show edit page and display basic show info.

**Acceptance Criteria:**
- [ ] Show edit page has venue dropdown
- [ ] Shows venue capacity info
- [ ] Shows seat availability stats (after seats generated)
- [ ] Can change venue (with confirmation if seats exist)

**Technical Tasks:**
- [ ] Update: `/pages/recitals/series/[seriesId]/shows/[id]/edit.vue`
- [ ] Add venue selector dropdown
- [ ] Add seat stats display
- [ ] Add validation for venue selection

**Parallel Work:** Can work on 2.2, 2.3, 5.1 in parallel

---

### Story 3.2: Seat Generation & Availability
**Priority:** P0 (Critical - Blocks public flow)
**Effort:** 1.5 days
**Dependencies:** Stories 2.1, 3.1
**Can Start:** After both 2.1 AND 3.1 complete

**Description:**
Add button to generate show_seats from venue template and display availability stats.

**Acceptance Criteria:**
- [ ] Admin can click "Generate Seats" button
- [ ] Calls database function to create show_seats
- [ ] Shows success message with count
- [ ] Cannot generate if seats already exist (unless confirmed)
- [ ] Shows seat availability stats (total, available, sold, reserved)
- [ ] Shows price breakdown by zone

**Technical Tasks:**
- [ ] Create API: `POST /api/shows/[id]/generate-seats`
- [ ] Create API: `GET /api/shows/[id]/seat-availability`
- [ ] Create composable: `composables/useShowSeats.ts`
- [ ] Add generate button to show edit page
- [ ] Add availability stats component

**Components:**
```
/components/show/
  └── SeatAvailabilityStats.vue
```

**Parallel Work:** Can work on 2.3, 2.4, 4.1, 5.1, 5.2 in parallel

---

## PHASE 4: Public Ticket Purchase Flow (Weeks 6-7)

### Story 4.1: Public Seat Viewing
**Priority:** P0 (Critical - Customer-facing)
**Effort:** 2 days
**Dependencies:** Story 3.2
**Can Start:** After 3.2 complete

**Description:**
Create public page to view available seats for a show.

**Acceptance Criteria:**
- [ ] Public can view show details (date, time, venue)
- [ ] Public can see seat map with available/sold status
- [ ] Seats color-coded by price zone
- [ ] Sold seats are greyed out
- [ ] Reserved seats show as temporarily unavailable
- [ ] Responsive on mobile

**Technical Tasks:**
- [ ] Create page: `/pages/public/recitals/[seriesId]/tickets.vue` (show selection)
- [ ] Create page: `/pages/public/recitals/shows/[showId]/seats.vue` (seat view)
- [ ] Update component: `/components/seating/SeatingChart.vue` (connect to API)
- [ ] Create API: `GET /api/public/shows/[id]/seats` (public endpoint)

**Parallel Work:** Can work on 5.1, 5.2, 5.3 in parallel

---

### Story 4.2: Seat Selection & Reservation
**Priority:** P0 (Critical - Customer-facing)
**Effort:** 3 days
**Dependencies:** Story 4.1
**Can Start:** After 4.1 complete

**Description:**
Add ability to select seats and create temporary reservation.

**Acceptance Criteria:**
- [ ] Customer can click to select seats
- [ ] Selected seats highlight
- [ ] Shows consecutive seat detection warning
- [ ] Can deselect seats
- [ ] Max 10 seats per order
- [ ] "Reserve Seats" button appears
- [ ] Creates 10-minute reservation
- [ ] Shows reservation timer
- [ ] Cannot select sold/reserved seats
- [ ] Shows total price

**Technical Tasks:**
- [ ] Create composable: `composables/useSeatSelection.ts`
- [ ] Update component: `/components/ticket/ReservationTimer.vue`
- [ ] Create API: `POST /api/seat-reservations/reserve`
- [ ] Create API: `POST /api/seat-reservations/release`
- [ ] Create API: `GET /api/seat-reservations/check`
- [ ] Add session management for reservations

**Parallel Work:** Can work on 5.1, 5.2, 5.3, 6.1 in parallel

---

### Story 4.3: Real-time Seat Updates
**Priority:** P1 (Important - Better UX)
**Effort:** 2 days
**Dependencies:** Story 4.2
**Can Start:** After 4.2 complete

**Description:**
Add Supabase real-time subscriptions so seat status updates instantly.

**Acceptance Criteria:**
- [ ] Seat map updates when other customers reserve/purchase
- [ ] No page refresh needed
- [ ] Shows smooth transitions
- [ ] Handles connection drops gracefully
- [ ] Unsubscribes on page leave

**Technical Tasks:**
- [ ] Add Supabase subscription to `show_seats` table
- [ ] Add real-time handlers in `useSeatSelection.ts`
- [ ] Add optimistic UI updates
- [ ] Add reconnection logic

**Parallel Work:** Can work on 4.4, 5.2, 5.3, 6.1 in parallel

---

### Story 4.4: Checkout & Payment
**Priority:** P0 (Critical - Revenue critical)
**Effort:** 3 days
**Dependencies:** Story 4.2
**Can Start:** After 4.2 complete (can run in parallel with 4.3)

**Description:**
Build checkout flow with customer info form and Stripe payment.

**Acceptance Criteria:**
- [ ] Customer enters name, email, phone
- [ ] Shows order summary (seats, prices, total)
- [ ] Integrates with Stripe Checkout
- [ ] Creates ticket_order record
- [ ] Creates payment_transaction record
- [ ] Marks seats as sold on payment success
- [ ] Releases seats on payment failure
- [ ] Shows confirmation page
- [ ] Sends to confirmation email (without tickets - Story 5.3)

**Technical Tasks:**
- [ ] Create page: `/pages/public/checkout/tickets/[showId].vue`
- [ ] Create page: `/pages/public/checkout/tickets/confirmation/[orderId].vue`
- [ ] Create composable: `composables/useTicketCheckout.ts`
- [ ] Create API: `POST /api/ticket-orders/create`
- [ ] Create API: `POST /api/ticket-orders/payment-intent`
- [ ] Create API: `POST /api/ticket-orders/confirm`
- [ ] Create API: `GET /api/ticket-orders/[id]`
- [ ] Add Stripe webhook handler: `/api/webhooks/stripe/ticket-payment`
- [ ] Use existing `useStripeService.ts`

**Components:**
```
/components/ticket-checkout/
  ├── CustomerInfoForm.vue
  ├── OrderSummary.vue
  └── PaymentForm.vue
```

**Parallel Work:** Can work on 5.1, 5.2, 5.3, 6.1 in parallel

---

## PHASE 5: Ticket Generation & Delivery (Week 8)

### Story 5.1: QR Code Generation
**Priority:** P0 (Critical - Ticket validation)
**Effort:** 0.5 days
**Dependencies:** None
**Can Start:** ✅ ANYTIME (No blockers)

**Description:**
Add QR code generation utility and test generation.

**Acceptance Criteria:**
- [ ] Can generate unique QR codes
- [ ] QR codes are URL-safe
- [ ] QR codes are collision-resistant
- [ ] Can generate QR code images (PNG/SVG)
- [ ] Has unit tests

**Technical Tasks:**
- [ ] Install: `npm install qrcode`
- [ ] Create util: `server/utils/qrCode.ts`
- [ ] Add function: `generateQRCode(data: string)`
- [ ] Add function: `generateQRCodeImage(data: string)`
- [ ] Add unit tests

**Parallel Work:** Can run in parallel with ALL Phase 2 and Phase 3 stories

---

### Story 5.2: PDF Ticket Generation
**Priority:** P0 (Critical - Ticket delivery)
**Effort:** 2 days
**Dependencies:** Story 5.1
**Can Start:** After 5.1 complete

**Description:**
Generate PDF tickets with QR codes and show details.

**Acceptance Criteria:**
- [ ] PDF contains show details (name, date, time, venue)
- [ ] PDF contains seat details (section, row, seat)
- [ ] PDF contains QR code for validation
- [ ] PDF contains order number
- [ ] PDF is visually appealing
- [ ] PDF uploads to Supabase Storage
- [ ] PDF URL saved to ticket record

**Technical Tasks:**
- [ ] Create util: `server/utils/ticketPdf.ts`
- [ ] Design PDF template
- [ ] Add function: `generateTicketPDF(ticket)`
- [ ] Add function: `uploadTicketPDF(blob, ticketId)`
- [ ] Create API: `POST /api/tickets/generate-pdf`
- [ ] Create API: `GET /api/tickets/[id]/download`
- [ ] Add Supabase Storage bucket: `ticket-pdfs`

**Parallel Work:** Can work on 2.3, 2.4, 3.2, 4.1, 4.2, 4.3, 6.1 in parallel

---

### Story 5.3: Email Delivery & Templates
**Priority:** P0 (Critical - Customer communication)
**Effort:** 1.5 days
**Dependencies:** Story 5.2
**Can Start:** After 5.2 complete

**Description:**
Send confirmation emails with ticket PDFs attached.

**Acceptance Criteria:**
- [ ] Email sent on successful payment
- [ ] Email contains order summary
- [ ] Email contains show details
- [ ] Email has ticket PDFs attached (or download links)
- [ ] Email is mobile-responsive
- [ ] Email uses studio branding
- [ ] Can resend emails from admin

**Technical Tasks:**
- [ ] Create email template: `server/templates/ticket-confirmation.html`
- [ ] Create util: `server/utils/ticketEmail.ts`
- [ ] Add function: `sendTicketConfirmationEmail(order)`
- [ ] Update `POST /api/ticket-orders/confirm` to send email
- [ ] Create API: `POST /api/tickets/resend-email`
- [ ] Use existing Mailgun integration

**Parallel Work:** Can work on 4.2, 4.3, 4.4, 5.4, 6.1, 6.2 in parallel

---

### Story 5.4: Ticket Lookup
**Priority:** P1 (Important - Customer self-service)
**Effort:** 1 day
**Dependencies:** Story 5.2
**Can Start:** After 5.2 complete (can run in parallel with 5.3)

**Description:**
Create public page where customers can look up their orders by email.

**Acceptance Criteria:**
- [ ] Customer enters email address
- [ ] Shows all orders for that email
- [ ] Shows order details (show, seats, date)
- [ ] Can download ticket PDFs
- [ ] Can resend confirmation email

**Technical Tasks:**
- [ ] Create page: `/pages/public/tickets/lookup.vue`
- [ ] Create API: `GET /api/public/ticket-orders/lookup?email=...`
- [ ] Add download button for PDFs

**Parallel Work:** Can work on 4.3, 4.4, 5.3, 6.1, 6.2 in parallel

---

## PHASE 6: Admin Order Management (Week 9)

### Story 6.1: Order List & Details
**Priority:** P0 (Critical - Admin tool)
**Effort:** 2 days
**Dependencies:** Story 4.4
**Can Start:** After 4.4 complete

**Description:**
Create admin pages to view and search all ticket orders.

**Acceptance Criteria:**
- [ ] Admin can view list of all orders
- [ ] List shows: order number, customer, show, date, status, total
- [ ] Can filter by show, status, date range
- [ ] Can search by customer name/email
- [ ] Can sort by columns
- [ ] Pagination works
- [ ] Can click to view order details
- [ ] Order details show: customer info, seats, payment info, tickets

**Technical Tasks:**
- [ ] Create page: `/pages/admin/ticketing/orders/index.vue`
- [ ] Create page: `/pages/admin/ticketing/orders/[id].vue`
- [ ] Create API: `GET /api/admin/ticketing/orders` (with filters)
- [ ] Create API: `GET /api/admin/ticketing/orders/[id]`

**Components:**
```
/components/admin-ticketing/
  ├── OrderList.vue
  ├── OrderFilters.vue
  └── OrderDetails.vue
```

**Parallel Work:** Can work on 4.2, 4.3, 5.2, 5.3, 5.4 in parallel

---

### Story 6.2: Dashboard & Analytics
**Priority:** P1 (Important - Business insights)
**Effort:** 2 days
**Dependencies:** Story 6.1
**Can Start:** After 6.1 complete

**Description:**
Create ticketing dashboard with sales metrics and visualizations.

**Acceptance Criteria:**
- [ ] Shows total tickets sold by show
- [ ] Shows total revenue by show
- [ ] Shows seat sales heat map
- [ ] Shows recent orders (last 10)
- [ ] Shows upcoming shows with availability
- [ ] Updates in real-time
- [ ] Can filter by date range

**Technical Tasks:**
- [ ] Create page: `/pages/admin/ticketing/dashboard.vue`
- [ ] Create API: `GET /api/admin/ticketing/dashboard`
- [ ] Install: `npm install chart.js vue-chartjs` (if not already)
- [ ] Create charts for metrics

**Components:**
```
/components/admin-ticketing/
  ├── SalesChart.vue
  ├── RevenueMetrics.vue
  ├── SeatHeatMap.vue
  └── RecentOrders.vue
```

**Parallel Work:** Can work on 5.3, 5.4, 6.3 in parallel

---

### Story 6.3: Refund Processing
**Priority:** P1 (Important - Customer service)
**Effort:** 1.5 days
**Dependencies:** Story 6.1
**Can Start:** After 6.1 complete (can run in parallel with 6.2)

**Description:**
Add ability for admin to issue refunds through Stripe.

**Acceptance Criteria:**
- [ ] Admin can click "Issue Refund" on order
- [ ] Shows confirmation dialog
- [ ] Can choose full or partial refund
- [ ] Processes refund through Stripe
- [ ] Marks order as refunded
- [ ] Releases seats back to available
- [ ] Sends refund confirmation email
- [ ] Shows refund in order history

**Technical Tasks:**
- [ ] Create API: `POST /api/admin/ticketing/orders/[id]/refund`
- [ ] Add Stripe refund logic
- [ ] Update order status
- [ ] Release seats (update show_seats)
- [ ] Add refund email template

**Parallel Work:** Can work on 5.4, 6.2, 6.4 in parallel

---

### Story 6.4: Sales Reports
**Priority:** P2 (Nice to have)
**Effort:** 1 day
**Dependencies:** Story 6.2
**Can Start:** After 6.2 complete

**Description:**
Generate exportable sales reports (CSV/Excel).

**Acceptance Criteria:**
- [ ] Can export order list as CSV
- [ ] Can export sales summary by show
- [ ] Can export revenue report
- [ ] Can filter exports by date range
- [ ] Download button works
- [ ] CSV is well-formatted

**Technical Tasks:**
- [ ] Create API: `GET /api/admin/ticketing/reports/sales.csv`
- [ ] Create API: `GET /api/admin/ticketing/reports/revenue.csv`
- [ ] Add CSV generation logic
- [ ] Add download buttons to dashboard

**Parallel Work:** Can work on 6.3, Phase 7 stories in parallel

---

## PHASE 7: Testing & Polish (Week 10)

### Story 7.1: Integration Testing
**Priority:** P0 (Critical - Quality assurance)
**Effort:** 2 days
**Dependencies:** All Phase 2-6 stories
**Can Start:** After ALL features complete

**Description:**
Write integration tests for critical user flows.

**Test Scenarios:**
- [ ] Admin can create venue and seat map
- [ ] Admin can generate show seats
- [ ] Customer can view and select seats
- [ ] Customer can complete checkout
- [ ] Payment succeeds and tickets generated
- [ ] Customer receives email
- [ ] Admin can view order
- [ ] Admin can issue refund

**Technical Tasks:**
- [ ] Write integration tests with Vitest
- [ ] Test API endpoints
- [ ] Test database functions
- [ ] Test RLS policies
- [ ] Test payment flow (Stripe test mode)

---

### Story 7.2: Performance Optimization
**Priority:** P1 (Important - User experience)
**Effort:** 1.5 days
**Dependencies:** Story 7.1
**Can Start:** After 7.1 complete

**Description:**
Optimize database queries, add caching, lazy loading.

**Tasks:**
- [ ] Add database indexes (review query plans)
- [ ] Add API response caching
- [ ] Lazy load seat map images
- [ ] Optimize PDF generation (parallel processing)
- [ ] Add loading skeletons
- [ ] Compress images

---

### Story 7.3: Security Audit
**Priority:** P0 (Critical - Security)
**Effort:** 1 day
**Dependencies:** Story 7.1
**Can Start:** After 7.1 complete (can run in parallel with 7.2)

**Description:**
Review security of entire system.

**Checklist:**
- [ ] Review all RLS policies
- [ ] Test unauthorized access
- [ ] Check API endpoint authorization
- [ ] Validate all user inputs
- [ ] Test SQL injection prevention
- [ ] Test XSS prevention
- [ ] Review Stripe webhook signature validation
- [ ] Test reservation timeout (can't hold seats forever)
- [ ] Test concurrent seat purchases (no overselling)

---

### Story 7.4: Documentation
**Priority:** P1 (Important - Maintenance)
**Effort:** 1 day
**Dependencies:** Story 7.1
**Can Start:** After 7.1 complete

**Description:**
Write user guides and technical documentation.

**Documentation:**
- [ ] Admin guide: How to create venues
- [ ] Admin guide: How to build seat maps
- [ ] Admin guide: How to manage orders
- [ ] Technical docs: Database schema
- [ ] Technical docs: API reference
- [ ] Technical docs: RLS policies
- [ ] Technical docs: Payment flow

---

## Summary: Parallel Work Opportunities

### ✅ Can Start IMMEDIATELY (No Blockers)
- **Story 2.1:** Venue Management CRUD
- **Story 5.1:** QR Code Generation

### Week 3-4 (After 2.1 Complete)
**Sequential:**
- Story 2.1 → 2.2 → 2.3 → 2.4

**Parallel Opportunities:**
- **While working on 2.2:** Start 5.1
- **While working on 2.3:** Start 3.1, continue 5.1
- **While working on 2.4:** Start 3.2, 5.2

### Week 5 (Show Configuration)
**Sequential:**
- Story 3.1 (requires 2.1)
- Story 3.2 (requires 2.1 + 3.1)

**Parallel Opportunities:**
- **While working on 3.1-3.2:** Continue 5.2, start 4.1

### Week 6-7 (Public Flow)
**Sequential:**
- Story 4.1 → 4.2 → (4.3 OR 4.4)

**Parallel Opportunities:**
- **While working on 4.1:** Continue 5.2
- **While working on 4.2:** Start 5.3, 6.1
- **4.3 and 4.4 can run in parallel** (different developers)
- **While working on 4.3-4.4:** Continue 5.3, 5.4, 6.1

### Week 8 (Tickets)
**Sequential:**
- Story 5.1 → 5.2 → 5.3
- Story 5.4 (parallel with 5.3)

**Parallel Opportunities:**
- **5.3 and 5.4 can run in parallel**
- **While working on 5.3-5.4:** Start 6.1, 6.2

### Week 9 (Admin)
**Sequential:**
- Story 6.1 → (6.2, 6.3, 6.4 can be parallel)

**Parallel Opportunities:**
- **6.2, 6.3, 6.4 can ALL run in parallel** (different features)

### Week 10 (Testing)
**Sequential:**
- Story 7.1 → (7.2, 7.3, 7.4 can be parallel)

---

## Critical Path (Must Complete in Order)

```
2.1 → 2.2 → 2.3 → 3.2 → 4.1 → 4.2 → 4.4 → 5.2 → 5.3 → 7.1
```

This is the MINIMUM sequence that must complete. Everything else can be done in parallel.

---

## Recommended Implementation Order (Single Developer)

### Week 3 ✅ COMPLETE
1. ✅ Story 2.1: Venue Management (2 days) - DONE
2. ✅ Story 5.1: QR Code Generation (0.5 days) - DONE
3. ✅ Story 2.2: Sections & Price Zones (1.5 days) - DONE

### Week 4 ✅ COMPLETE
4. ✅ Story 2.3: Seat Map Builder (4 days) - DONE
5. ✅ Story 3.1: Show-Venue Linking (1 day) - DONE

### Week 5 ✅ COMPLETE
6. ✅ Story 2.4: CSV Import (1 day) - DONE
7. ✅ Story 3.2: Seat Generation (1.5 days) - DONE
8. ✅ Story 5.2: PDF Generation (2 days) - DONE

### Week 6 ✅ COMPLETE
9. ✅ Story 4.1: Public Seat Viewing (2 days) - DONE
10. ✅ Story 4.2: Seat Selection & Reservation (3 days) - DONE

### Week 7 ✅ COMPLETE
11. ✅ Story 4.4: Checkout & Payment (3 days) - DONE
12. ✅ Story 5.3: Email Delivery (1.5 days) - DONE

### Week 8 ✅ COMPLETE
13. ✅ Story 4.3: Real-time Updates (2 days) - DONE
14. ✅ Story 5.4: Ticket Lookup (1 day) - DONE
15. ✅ Story 6.1: Order List (2 days) - DONE

### Week 9 ⚠️ IN PROGRESS
16. ❌ Story 6.2: Dashboard (2 days) - **TODO**
17. ❌ Story 6.3: Refunds (1.5 days) - **TODO**
18. ❌ Story 6.4: Reports (1 day) - **TODO**

### Week 10 ❌ TODO
19. ❌ Story 7.1: Integration Testing (2 days) - **TODO**
20. ❌ Story 7.2: Performance Optimization (1.5 days) - **TODO**
21. ❌ Story 7.3: Security Audit (1 day) - **TODO**
22. ❌ Story 7.4: Documentation (0.5 days) - **TODO**

---

## Blockers & Dependencies Summary

### Stories with NO Blockers (Can start anytime)
- Story 2.1 (Venue CRUD)
- Story 5.1 (QR Code)

### Stories with HARD Blockers (Must wait)
- Story 2.2 requires 2.1 ✅
- Story 2.3 requires 2.2 ✅
- Story 3.2 requires 2.1 + 3.1 ✅
- Story 4.1 requires 3.2 ✅
- Story 4.2 requires 4.1 ✅
- Story 4.4 requires 4.2 ✅
- Story 5.2 requires 5.1 ✅
- Story 5.3 requires 5.2 ✅
- Story 6.1 requires 4.4 ✅
- Story 7.1 requires ALL features ✅

### Stories with SOFT Blockers (Recommended but not required)
- Story 2.4 recommended after 2.3 (but could start after 2.1)
- Story 3.1 recommended after 2.1 (independent path)
- Story 4.3 recommended after 4.2 (but could start earlier for testing)

---

## Risk Assessment

### HIGH RISK (Need attention)
- **Story 4.2:** Seat reservation timing (race conditions)
- **Story 4.3:** Real-time updates (concurrent users)
- **Story 4.4:** Payment flow (money involved)
- **Story 7.3:** Security audit (prevent overselling)

### MEDIUM RISK
- **Story 2.3:** Seat map builder (complex UI)
- **Story 5.2:** PDF generation (performance)
- **Story 6.3:** Refund processing (Stripe integration)

### LOW RISK
- All other stories (standard CRUD operations)

---

**Total Effort:** ~42 days (8-9 weeks for single developer)
**Completed:** ~34.5 days (82% complete) ✅
**Remaining:** ~7.5 days (18% remaining)
**Critical Path:** ~28 days (6 weeks minimum)
**Progress:** Week 8 of 10 complete
