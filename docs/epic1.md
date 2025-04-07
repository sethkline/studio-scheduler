# Epic 1: Recital Program Creation and Management

## Overview
This feature set will enable studio administrators to create, manage, and generate professional recital programs that include performance details, participant lists, artistic notes, acknowledgments, and promotional content.

## Database Enhancements

### New Tables Required:
- [x] **recital_programs**
   - id: uuid PRIMARY KEY
   - recital_id: uuid REFERENCES recitals(id)
   - cover_image_url: text
   - artistic_director_note: text
   - acknowledgments: text
   - created_at: timestamp with time zone
   - updated_at: timestamp with time zone

- [x] **recital_program_advertisements**
   - id: uuid PRIMARY KEY
   - recital_program_id: uuid REFERENCES recital_programs(id)
   - image_url: text
   - title: text
   - description: text
   - order_position: integer
   - created_at: timestamp with time zone
   - updated_at: timestamp with time zone

### Modifications to Existing Tables:
- [x] **recital_performances**
   - Add columns:
     - choreographer: character varying (if not already tracked elsewhere)
     - performance_notes: text

## API Endpoints

### Recital Program Management
- [x] `GET /api/recitals/:id/program` - Get program details for a specific recital
- [x] `POST /api/recitals/:id/program` - Create/update program details
- [x] `PUT /api/recitals/:id/program/cover` - Upload cover image
- [x] `POST /api/recitals/:id/program/advertisements` - Add advertisement
- [x] `DELETE /api/recitals/:id/program/advertisements/:adId` - Remove advertisement
- [x] `PUT /api/recitals/:id/program/advertisements/:adId/position` - Update advertisement position
- [x] `PUT /api/recitals/:id/program/artistic-note` - Save artistic director's note
- [x] `PUT /api/recitals/:id/program/acknowledgments` - Save acknowledgments section

### Performance Management
- [x] `PUT /api/recitals/:id/performances/reorder` - Update performance order
- [x] `PUT /api/recitals/:id/performances/:performanceId` - Update performance details
- [x] `GET /api/recitals/:id/performances/export` - Generate program PDF

## User Interface Components

### 1. Recital Program Dashboard
- [ ] Overview of program status
- [x] Quick links to different sections (performances, notes, ads)
- [x] PDF generation button
- [x] Program preview

### 2. Performance Order Manager
- [ ] Drag and drop interface for performance ordering
- [ ] Ability to edit performance details (song, artist, choreographer)
- [ ] Student participants view/management
- [ ] Visual indicators for special requirements (e.g., quick changes)

### 3. Cover Image Upload
- [ ] Image upload with preview
- [ ] Crop/resize functionality
- [ ] Text overlay editor for title, date, etc.

### 4. Content Editors
- [ ] Rich text editor for artistic director's note
- [ ] Rich text editor for acknowledgments
- [ ] Advertisement section manager with image upload

### 5. Program Preview
- [ ] Interactive preview of the complete program
- [ ] Page-by-page navigation
- [ ] Export to PDF functionality

## User Stories and Tasks

### As an admin, I want to create a new recital program
- [ ] Create UI for initializing program
- [ ] Implement API for creating program record
- [ ] Set up database connections

### As an admin, I want to manage the performance order
- [ ] Implement drag-and-drop interface
- [ ] Create backend API for order updates
- [ ] Add visual feedback for successful reordering

### As an admin, I want to upload a cover image
- [ ] Create image upload component
- [ ] Implement image storage
- [ ] Add preview functionality

### As an admin, I want to add artistic director's note
- [ ] Implement rich text editor
- [ ] Create save functionality
- [ ] Add preview in program context

### As an admin, I want to add acknowledgments
- [ ] Implement rich text editor
- [ ] Create save functionality
- [ ] Add preview in program context

### As an admin, I want to add advertisements
- [ ] Create advertisement manager UI
- [ ] Implement image upload
- [ ] Add ordering functionality

### As an admin, I want to preview the complete program
- [ ] Create interactive preview component
- [ ] Implement page-by-page navigation
- [ ] Add visual styling matching final output

### As an admin, I want to export the program to PDF
- [ ] Implement PDF generation service
- [ ] Create download functionality
- [ ] Ensure proper formatting and layout

## Technical Considerations

### PDF Generation
- [ ] Utilize a PDF generation library (e.g., PDFKit, jsPDF)
- [ ] Ensure proper handling of images, text formatting
- [ ] Support for page breaks and multi-page layouts

### Image Storage
- [ ] Set up secure cloud storage for images
- [ ] Implement proper access controls
- [ ] Handle image optimization and resizing

### Performance Optimization
- [ ] Paginate large performance lists
- [ ] Optimize image loading in preview
- [ ] Cache program data where appropriate

## Acceptance Criteria

- [ ] Admins can create a new recital program associated with a recital
- [ ] Performance order can be arranged via drag and drop
- [ ] Cover image can be uploaded and previewed
- [ ] Artistic director's note and acknowledgments can be edited with rich text
- [ ] Advertisements can be added, ordered, and removed
- [ ] Complete program can be previewed page by page
- [ ] Program can be exported as a professional-quality PDF
- [ ] All student names are correctly listed under their performances
- [ ] Song titles, artists, and choreographers are properly formatted and displayed
- [ ] Changes to the program are saved in real-time

## Future Enhancements

- [ ] Templates for recurring program styles
- [ ] Automated student quick-change warnings
- [ ] Collaborative editing features
- [ ] QR code generation for digital program access
- [ ] Email distribution of digital programs
- [ ] Custom page layouts and styling options
- [ ] Auto-generation of student participation certificates