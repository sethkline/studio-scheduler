# Payroll Tracking System

## Overview

The Payroll Tracking System provides comprehensive teacher payroll management with automatic hour calculation from schedules, substitute tracking, overtime calculations, and pay stub generation.

## Features

✅ **Automatic Hour Calculation** - Automatically generates time entries from scheduled classes
✅ **Pay Rate Management** - Track teacher pay rates with historical tracking
✅ **Substitute Pay Tracking** - Handle substitute teacher compensation
✅ **Overtime & Bonus Tracking** - Automatic overtime calculation with configurable thresholds
✅ **Pay Stub Generation** - Generate detailed pay stubs for each pay period
✅ **Payroll Export** - Export to CSV, QuickBooks, and other payroll software formats

## Database Setup

### 1. Run the Database Migration

Execute the SQL migration to create all necessary tables:

```bash
# Connect to your Supabase database
psql -U postgres -h your-supabase-host -d postgres

# Run the migration
\i docs/database/payroll-schema.sql
```

Or use the Supabase Dashboard:
1. Navigate to the SQL Editor
2. Copy and paste the contents of `docs/database/payroll-schema.sql`
3. Execute the script

### 2. Verify Tables

The migration creates the following tables:
- `teacher_pay_rates` - Teacher compensation rates
- `payroll_periods` - Pay period definitions
- `payroll_time_entries` - Hours worked tracking
- `payroll_adjustments` - Bonuses, deductions, etc.
- `payroll_pay_stubs` - Generated pay stubs
- `payroll_export_log` - Export history

## Getting Started

### 1. Set Up Teacher Pay Rates

Before processing payroll, configure pay rates for your teachers:

1. Navigate to **Payroll > Pay Rates**
2. Click **Add Pay Rate**
3. Configure:
   - **Teacher**: Select the teacher
   - **Rate Type**: Choose hourly, per class, or salary
   - **Rate Amount**: Enter compensation amount
   - **Effective From/To**: Set date range (leave "To" empty for current rate)
   - **Overtime Settings**: Enable and configure if needed
     - Threshold: Hours before overtime kicks in (e.g., 40 hours/period)
     - Multiplier: Overtime rate multiplier (e.g., 1.5 for time-and-a-half)

### 2. Create a Payroll Period

1. Navigate to **Payroll > Payroll Periods**
2. Click **New Period**
3. Configure:
   - **Period Type**: Weekly, bi-weekly, semi-monthly, or monthly
   - **Start Date**: Beginning of pay period
   - **End Date**: Auto-calculated based on type (can be adjusted)
   - **Pay Date**: When teachers will be paid
   - **Period Name**: Auto-generated descriptive name

### 3. Generate Time Entries

Once a payroll period is created:

1. Click on the period to view details
2. Click **Generate Time Entries**
3. The system will:
   - Find all scheduled classes in the date range
   - Create time entries for each class occurrence
   - Calculate hours based on class start/end times
   - Skip entries that already exist

### 4. Review & Adjust

In the payroll period detail view:

**Time Entries Tab:**
- Review auto-generated entries
- Add manual entries for non-scheduled work
- Mark substitute entries (original teacher still gets paid, sub gets their rate)
- Approve entries

**Adjustments Tab:**
- Add bonuses (performance, holiday, etc.)
- Add deductions (uniform, equipment, etc.)
- Add reimbursements (mileage, supplies, etc.)
- Add corrections for any errors

### 5. Generate Pay Stubs

1. Click **Generate Pay Stubs**
2. The system will:
   - Summarize all time entries per teacher
   - Apply all adjustments
   - Calculate regular vs overtime hours/pay
   - Create pay stub records

### 6. Export Payroll

Export payroll data for processing:

1. Click **Export**
2. Choose format:
   - **CSV**: General-purpose export (compatible with Excel, Google Sheets)
   - **QuickBooks**: IIF format for QuickBooks import
   - More formats available

The export includes:
- Teacher information
- Regular and overtime hours
- Pay amounts
- Bonuses and deductions
- Net pay calculations

## Usage Scenarios

### Scenario 1: Regular Weekly Payroll

```
Week 1:
1. Create payroll period (weekly, Jan 1-7)
2. Generate time entries (auto-creates from schedule)
3. Review entries (usually no changes needed)
4. Generate pay stubs
5. Export to payroll software
6. Process payments
7. Mark period as "Paid"
```

### Scenario 2: Handling Substitutes

```
Teacher A is sick on Tuesday:
1. Go to the payroll period
2. Find Teacher A's time entry for Tuesday
3. Click edit
4. Check "Is Substitute"
5. Select Teacher B as the substitute
6. Optional: Override substitute rate if different
7. Save

Result:
- Teacher A's time entry is marked as substituted
- Teacher B gets a new time entry with substitute pay
```

### Scenario 3: Adding a Bonus

```
Teacher performance bonus:
1. Navigate to payroll period
2. Go to Adjustments tab
3. Click Add Adjustment
4. Select:
   - Teacher
   - Type: Bonus
   - Category: Performance Bonus
   - Amount: $100
   - Description: "Excellent student retention"
5. Save

The bonus will be included in the pay stub automatically.
```

### Scenario 4: Overtime Calculation

```
Teacher with overtime enabled (40 hour threshold, 1.5x multiplier):

Classes scheduled: 42 hours

Result:
- Regular hours: 40
- Overtime hours: 2
- Regular pay: 40 × $25 = $1,000
- Overtime pay: 2 × $25 × 1.5 = $75
- Total: $1,075

This is calculated automatically when time entries are generated.
```

## Pay Rate Types

### Hourly Rate
- Best for: Part-time teachers, substitute teachers
- Payment: Hours worked × rate
- Overtime: Can be enabled with threshold

### Per Class Rate
- Best for: Teachers who teach varying class lengths
- Payment: Number of classes × rate
- Overtime: Not typically applicable

### Salary
- Best for: Full-time teachers with consistent schedules
- Payment: Fixed amount per period
- Overtime: Usually not applicable (exempt employees)

## Permissions

The payroll system uses Role-Based Access Control (RBAC):

### Admin Role
- Full access to all payroll features
- Can manage pay rates
- Can approve payroll
- Can export payroll data

### Staff Role
- Can view and manage payroll
- Can generate time entries and pay stubs
- Cannot manage pay rates
- Cannot export payroll

### Teacher Role
- Can view own pay stubs only
- No access to other teachers' data
- No management capabilities

## Best Practices

### 1. Set Up Pay Rates First
Always configure pay rates before creating payroll periods. The system needs current rates to calculate pay correctly.

### 2. Regular Review Schedule
- Review time entries weekly
- Approve entries before generating pay stubs
- Export and process payroll consistently

### 3. Historical Rates
When changing a teacher's pay rate:
- Set an end date on the current rate
- Create a new rate with a start date
- This maintains historical accuracy for past periods

### 4. Backup Before Major Changes
Before updating pay rates or making bulk adjustments, consider exporting current data as a backup.

### 5. Audit Trail
The system maintains:
- Created by / Updated by fields
- Timestamps on all records
- Export logs
- Status changes

## Troubleshooting

### Issue: Time entries not generating

**Check:**
- Is there an active schedule?
- Are classes scheduled during the payroll period?
- Do the classes have teacher assignments?
- Are pay rates configured for those teachers?

### Issue: Pay calculations seem incorrect

**Check:**
- Teacher's current pay rate
- Overtime settings (threshold and multiplier)
- Manual adjustments that may have been added
- Whether entries are marked as substitute

### Issue: Cannot export payroll

**Check:**
- Have pay stubs been generated?
- Does the user have export permissions?
- Check browser console for errors

## API Reference

### Endpoints

```
GET  /api/payroll/pay-rates           - List pay rates
POST /api/payroll/pay-rates           - Create pay rate
PUT  /api/payroll/pay-rates/:id       - Update pay rate

GET  /api/payroll/periods             - List payroll periods
POST /api/payroll/periods             - Create period

GET  /api/payroll/time-entries        - List time entries
POST /api/payroll/time-entries/generate - Generate from schedule

GET  /api/payroll/adjustments         - List adjustments
POST /api/payroll/adjustments         - Create adjustment

GET  /api/payroll/pay-stubs           - List pay stubs
POST /api/payroll/pay-stubs/generate  - Generate pay stubs

POST /api/payroll/export              - Export payroll data
```

### Composable

```typescript
const payrollService = usePayrollService()

// Fetch pay rates
const rates = await payrollService.fetchPayRates({ teacher_id, current_only: true })

// Create period
const period = await payrollService.createPayrollPeriod({
  period_name: 'January 2024 - Week 1',
  period_type: 'weekly',
  start_date: '2024-01-01',
  end_date: '2024-01-07',
  pay_date: '2024-01-14'
})

// Generate time entries
await payrollService.generateTimeEntries(period.id)

// Generate pay stubs
await payrollService.generatePayStubs(period.id)

// Export
const data = await payrollService.exportPayroll(period.id, 'csv')
payrollService.downloadPayrollExport(data.file_name, data.content, data.mime_type)
```

## Database Functions

The system includes PostgreSQL functions for automatic calculations:

### `calculate_hours(start_time, end_time)`
Calculates hours between two times.

### `get_current_pay_rate(teacher_id, date)`
Retrieves the active pay rate for a teacher on a specific date.

### `calculate_time_entry_pay()`
Trigger function that automatically calculates regular/overtime hours and pay amounts when time entries are created or updated.

### `update_payroll_period_totals()`
Trigger function that updates period summary totals when time entries or adjustments change.

## Security

### Row Level Security (RLS)

All payroll tables have RLS enabled:

- **Admins/Staff**: Full access to all records
- **Teachers**: Can only view their own pay stubs
- **Parents/Students**: No access to payroll data

### Data Encryption

Sensitive payroll data should be:
- Stored in Supabase with encryption at rest
- Transmitted over HTTPS only
- Access logged for compliance

## Compliance

### Record Retention

Maintain payroll records according to local regulations:
- Federal (US): 3-7 years depending on type
- State laws may require longer retention
- Export and archive old periods regularly

### Reporting

The system supports generating reports for:
- Year-to-date earnings
- Tax reporting (W-2, 1099 preparation)
- Audit trails

## Future Enhancements

Planned features for future releases:
- [ ] PDF pay stub generation
- [ ] Email pay stubs to teachers
- [ ] Direct deposit integration
- [ ] Tax withholding calculations
- [ ] Year-end tax form generation
- [ ] Custom pay rate formulas
- [ ] Payroll approval workflow
- [ ] Mobile app for teachers to view pay stubs

## Support

For issues or questions:
1. Check this documentation
2. Review the database schema: `docs/database/payroll-schema.sql`
3. Check API endpoints for error messages
4. Review application logs

---

**Version**: 1.0.0
**Last Updated**: 2024-11-06
**Maintainer**: Dance Studio Scheduler Team
