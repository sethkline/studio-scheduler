# CSV Seat Import Guide

## Overview

The CSV Seat Import feature allows administrators to bulk import seats from a CSV file into the venue seat map. This is useful for quickly setting up large venues without having to manually create each seat one by one.

## CSV Format

### Required Columns

The CSV file must have the following headers:

```csv
section_name,row_name,seat_number,seat_type,price_zone_name,x_position,y_position
```

### Column Descriptions

| Column | Required | Description | Example Values |
|--------|----------|-------------|----------------|
| `section_name` | Yes | Name of the venue section (must already exist) | Orchestra, Balcony, Mezzanine |
| `row_name` | Yes | Row identifier | A, B, C, 1, 2, 3 |
| `seat_number` | Yes | Seat number within the row | 1, 2, 3, 101, 102 |
| `seat_type` | No | Type of seat (default: regular) | regular, ada, house, blocked |
| `price_zone_name` | No | Name of the price zone (must already exist if provided) | Premium, Standard, Economy |
| `x_position` | No | X coordinate for visual layout | 100, 200, 300 |
| `y_position` | No | Y coordinate for visual layout | 100, 200, 300 |

### Seat Types

- **regular**: Standard sellable seat
- **ada**: ADA-compliant accessible seat
- **house**: Complimentary house seat (not for sale)
- **blocked**: Blocked seat (not for sale)

## Example CSV File

```csv
section_name,row_name,seat_number,seat_type,price_zone_name,x_position,y_position
Orchestra,A,1,regular,Premium,100,100
Orchestra,A,2,regular,Premium,120,100
Orchestra,A,3,regular,Premium,140,100
Orchestra,A,4,regular,Premium,160,100
Orchestra,B,1,regular,Standard,100,120
Orchestra,B,2,regular,Standard,120,120
Orchestra,B,3,regular,Standard,140,120
Balcony,A,1,ada,Economy,100,50
Balcony,A,2,regular,Economy,120,50
Balcony,A,3,regular,Economy,140,50
```

## Step-by-Step Import Process

### Prerequisites

Before importing seats, ensure that:

1. The venue exists
2. All sections referenced in the CSV have been created
3. All price zones referenced in the CSV have been created

### Import Steps

1. Navigate to the venue's seat map builder page:
   - Admin → Ticketing → Venues → [Select Venue] → Seat Map

2. Click the **"Import CSV"** button in the toolbar

3. Choose one of two options:
   - **Download the template** CSV file and fill it in
   - Upload your existing CSV file
   - **Or paste** CSV data directly into the text area

4. Review the preview:
   - Check that all rows are valid (green checkmark)
   - Fix any validation errors (red X)
   - Common errors:
     - Section name doesn't exist
     - Price zone name doesn't exist
     - Invalid seat type
     - Missing required fields

5. Click **"Import Seats"** to complete the import

6. Review the results dialog:
   - Number of seats successfully created
   - Number of seats skipped (duplicates or errors)
   - Warnings for any issues

## Validation Rules

The import process validates each row and will skip invalid entries:

### Required Field Validation
- `section_name`, `row_name`, and `seat_number` must not be empty

### Reference Validation
- Section name must match an existing section in the venue
- Price zone name (if provided) must match an existing price zone
- Seat type must be one of: regular, ada, house, blocked

### Duplicate Detection
- Seats are uniquely identified by: section + row + seat number
- If a seat already exists, it will be skipped
- If the same seat appears multiple times in the import file, only the first occurrence will be imported

### Position Validation
- X and Y positions must be valid numbers (if provided)
- Positions are optional and can be adjusted later in the visual builder

## Tips for Best Results

### Planning Your Import

1. **Start with sections and price zones**: Create all sections and price zones in the venue settings before importing seats

2. **Use consistent naming**:
   - Rows: A-Z for letters, 1-100 for numbers
   - Seats: Usually 1-N from left to right

3. **Plan your layout**:
   - Calculate positions ahead of time for proper spacing
   - Typical spacing: 40-50 pixels between seats
   - Group seats by section for easier management

### Creating Your CSV

1. **Use a spreadsheet application**:
   - Excel, Google Sheets, or Numbers
   - Export as CSV when done

2. **Download the template**:
   - Click "Download Template" in the import dialog
   - Use it as a starting point

3. **Test with a small batch first**:
   - Import 5-10 seats to verify the format
   - Check the visual layout
   - Then import the rest

### Common Pitfalls

❌ **Section/Price Zone name mismatch**
- CSV: "orchestra"
- Database: "Orchestra"
- Solution: Match the exact case and spelling

❌ **Duplicate seats**
- Import the same seat twice
- Solution: Use unique combinations of section + row + seat number

❌ **Missing positions**
- Seats without x/y positions will appear at 0,0
- Solution: Either provide positions in CSV or arrange manually after import

## Handling Errors

If seats are skipped during import:

1. Check the warnings in the results dialog
2. Common issues:
   - "Section not found" → Create the section first or fix the name
   - "Price zone not found" → Create the price zone or fix the name
   - "Duplicate seat" → Seat already exists in the database
   - "Invalid seat_type" → Use one of: regular, ada, house, blocked

3. Fix the issues in your CSV file
4. Re-import (only the failed rows will be added)

## Advanced: Generating CSV Programmatically

For very large venues, you can generate the CSV programmatically:

```python
# Example Python script to generate seats for a theater
import csv

sections = [
    {"name": "Orchestra", "rows": "ABCDEFGHIJKLM", "seats_per_row": 20, "price_zone": "Premium"},
    {"name": "Balcony", "rows": "ABCDEFGH", "seats_per_row": 15, "price_zone": "Standard"}
]

with open('seats.csv', 'w', newline='') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['section_name', 'row_name', 'seat_number', 'seat_type', 'price_zone_name', 'x_position', 'y_position'])

    y_offset = 0
    for section in sections:
        for row_idx, row in enumerate(section['rows']):
            for seat in range(1, section['seats_per_row'] + 1):
                writer.writerow([
                    section['name'],
                    row,
                    seat,
                    'regular',
                    section['price_zone'],
                    100 + (seat * 40),  # 40px spacing
                    100 + y_offset + (row_idx * 40)
                ])
        y_offset += len(section['rows']) * 40 + 100  # Space between sections
```

## API Reference

The import feature uses the following endpoint:

```
POST /api/venues/{venueId}/seats/import
```

**Request Body:**
```json
{
  "seats": [
    {
      "venue_id": "venue-uuid",
      "section_id": "section-uuid",
      "row_name": "A",
      "seat_number": "1",
      "seat_type": "regular",
      "price_zone_id": "price-zone-uuid",
      "is_sellable": true,
      "x_position": 100,
      "y_position": 100
    }
  ]
}
```

**Response:**
```json
{
  "created": 150,
  "skipped": [
    {
      "row_name": "A",
      "seat_number": "1",
      "error": "Duplicate seat (already exists)"
    }
  ],
  "total": 151,
  "seats": [...],
  "message": "Successfully imported 150 of 151 seats (1 skipped)"
}
```

## Troubleshooting

### Import button is disabled
- Ensure the venue has at least one section and one price zone configured

### All seats show validation errors
- Check that section names and price zone names exactly match those in the database
- Verify the CSV headers are correct

### Seats appear at wrong positions
- Check x_position and y_position values in CSV
- Use the visual builder to adjust positions after import
- Positions are in pixels

### Need to start over
- You can delete all seats and re-import
- Or manually delete specific seats from the seat map builder

## Support

For additional help:
- Check the in-app help tooltip (? button)
- Review the seat map builder documentation
- Contact your system administrator
