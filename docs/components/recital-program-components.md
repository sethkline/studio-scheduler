# Recital Program Component Guide

This guide provides details on the Vue.js components used to implement the Recital Program Management feature. These components work together to provide a complete solution for creating and managing professional recital programs.

## Main Components

### 1. RecitalProgramManager

The primary container component that orchestrates the entire program management experience.

**File Location:** `components/recital/RecitalProgramManager.vue`

**Dependencies:**
- Vue.js 3 with Composition API
- PrimeVue UI components (TabView, OrderList, Dialog, etc.)
- Supabase client for database operations

**Props:**
- `recitalId` (String, required): UUID of the recital

**Key Features:**
- Tabbed interface for organizing different program aspects
- Loading and saving program data
- PDF generation initiation
- Program preview functionality

**Usage Example:**
```html
<RecitalProgramManager :recitalId="recitalId" />
```

### 2. PerformanceOrderManager

Handles the ordering and editing of performances within the recital program.

**File Location:** `components/recital/PerformanceOrderManager.vue`

**Dependencies:**
- PrimeVue OrderList component
- Supabase client

**Props:**
- `performances` (Array, required): List of performances
- `classInstances` (Array, required): Available class instances

**Emits:**
- `update:performances`: When performances are reordered or edited
- `save`: When changes should be persisted

**Key Features:**
- Drag-and-drop reordering interface
- Performance details display
- Edit and view dancer modals
- Order persistence

**Usage Example:**
```html
<PerformanceOrderManager 
  v-model:performances="performances"
  :classInstances="classInstances"
  @save="savePerformanceOrder"
/>
```

### 3. ProgramContentEditor

Provides rich text editing for artistic director's note and acknowledgments.

**File Location:** `components/recital/ProgramContentEditor.vue`

**Dependencies:**
- PrimeVue Editor component
- Supabase client

**Props:**
- `programContent` (Object, required): Content data object
- `recitalId` (String, required): UUID of the recital

**Emits:**
- `update:programContent`: When content is updated
- `save`: When changes should be persisted

**Key Features:**
- Rich text editing with formatting options
- Auto-save functionality
- Separate editors for director's note and acknowledgments

**Usage Example:**
```html
<ProgramContentEditor
  v-model:programContent="programContent"
  :recitalId="recitalId"
  @save="saveProgramContent"
/>
```

### 4. CoverImageUploader

Handles the upload, preview, and management of the program cover image.

**File Location:** `components/recital/CoverImageUploader.vue`

**Dependencies:**
- PrimeVue FileUpload component
- Supabase Storage

**Props:**
- `coverImage` (String): Current cover image URL
- `recitalId` (String, required): UUID of the recital

**Emits:**
- `update:coverImage`: When cover image is updated or removed

**Key Features:**
- Image file upload with validation
- Image preview
- Remove option
- Direct integration with Supabase Storage

**Usage Example:**
```html
<CoverImageUploader
  v-model:coverImage="coverImage"
  :recitalId="recitalId"
/>
```

### 5. AdvertisementManager

Manages the program advertisements including creation, editing, and ordering.

**File Location:** `components/recital/AdvertisementManager.vue`

**Dependencies:**
- PrimeVue Dialog, Card, and Form components
- Supabase client and Storage

**Props:**
- `advertisements` (Array): Current advertisements
- `recitalId` (String, required): UUID of the recital
- `programId` (String): UUID of the program if it exists

**Emits:**
- `update:advertisements`: When advertisements are updated

**Key Features:**
- Grid display of current advertisements
- Add/edit/delete functionality
- Image upload handling
- Order management

**Usage Example:**
```html
<AdvertisementManager
  v-model:advertisements="advertisements"
  :recitalId="recitalId"
  :programId="program?.id"
/>
```

### 6. ProgramPreview

Provides a preview of how the final program will appear when generated as a PDF.

**File Location:** `components/recital/ProgramPreview.vue`

**Dependencies:**
- PrimeVue Dialog component

**Props:**
- `recital` (Object, required): Recital data
- `programContent` (Object, required): Content data
- `performances` (Array, required): Performance data
- `coverImage` (String): Cover image URL
- `advertisements` (Array): Advertisement data

**Key Features:**
- Page-by-page preview
- Visual representation matching final PDF
- Scrollable content
- PDF generation trigger

**Usage Example:**
```html
<ProgramPreview
  :recital="recital"
  :programContent="programContent"
  :performances="performances"
  :coverImage="coverImage"
  :advertisements="advertisements"
  @generatePdf="generatePdf"
/>
```

## Supporting Components

### 1. PerformanceEditDialog

Dialog for editing performance details.

**File Location:** `components/recital/dialogs/PerformanceEditDialog.vue`

**Key Features:**
- Form for editing performance metadata
- Song title, artist, choreographer inputs
- Duration setting
- Notes field

### 2. ViewDancersDialog

Dialog for viewing dancers assigned to a performance.

**File Location:** `components/recital/dialogs/ViewDancersDialog.vue`

**Key Features:**
- Table of dancers with status
- Link to class roster management
- Search and filter functionality

### 3. AddAdvertisementDialog

Dialog for adding or editing program advertisements.

**File Location:** `components/recital/dialogs/AddAdvertisementDialog.vue`

**Key Features:**
- Advertisement title and description inputs
- Image upload interface
- Image preview

## Composables

### 1. useRecitalProgramService

Custom composable for interfacing with the recital program API endpoints.

**File Location:** `composables/useRecitalProgramService.js`

**Methods:**
- `fetchRecitalProgram(recitalId)`: Get program data
- `updateProgramDetails(recitalId, programData)`: Update program content
- `uploadCoverImage(recitalId, imageFile)`: Upload cover image
- `addAdvertisement(recitalId, advertisementData)`: Add advertisement
- `updateAdvertisement(recitalId, adId, advertisementData)`: Update advertisement
- `deleteAdvertisement(recitalId, adId)`: Delete advertisement
- `reorderPerformances(recitalId, performanceOrder)`: Update performance order
- `generateProgramPDF(recitalId)`: Generate and download PDF

**Usage Example:**
```javascript
const { 
  fetchRecitalProgram, 
  updateProgramDetails, 
  generateProgramPDF 
} = useRecitalProgramService();

// In a setup() or async method
const { data } = await fetchRecitalProgram(recitalId);
```

### 2. useStorageUpload

Handles file uploads to Supabase Storage with progress tracking.

**File Location:** `composables/useStorageUpload.js`

**Methods:**
- `uploadFile(bucket, path, file)`: Upload file to storage
- `getPublicUrl(bucket, path)`: Get public URL for file
- `deleteFile(bucket, path)`: Delete file from storage

**Usage Example:**
```javascript
const { uploadFile, getPublicUrl } = useStorageUpload();

// In a method
const { data } = await uploadFile('program-assets', `recital-covers/${recitalId}-cover.jpg`, file);
const publicUrl = getPublicUrl('program-assets', data.path);
```

## State Management

### Recital Program Store

A Pinia store for managing recital program state across components.

**File Location:** `stores/recitalProgramStore.js`

**State:**
- `recital`: Current recital data
- `program`: Program metadata
- `performances`: Array of performances
- `advertisements`: Array of advertisements
- `loading`: Loading status flags
- `error`: Error messages

**Actions:**
- `fetchProgram(recitalId)`: Load all program data
- `savePerformanceOrder(recitalId, performances)`: Save new performance order
- `saveProgramContent(recitalId, content)`: Save program content
- `generatePdf(recitalId)`: Generate PDF file

**Usage Example:**
```javascript
const programStore = useRecitalProgramStore();

// In a setup() or method
await programStore.fetchProgram(recitalId);
```

## Component Interaction Flow

1. **Initial Loading:**
   - RecitalProgramManager loads and passes recitalId to the store
   - Store fetches all program data from the API
   - Components receive data through props or store access

2. **Program Content Editing:**
   - User edits content in ProgramContentEditor
   - Changes are emitted back to parent
   - Save action dispatches API call through service

3. **Performance Ordering:**
   - User drags performances in PerformanceOrderManager
   - OrderList emits updated array
   - Save action triggers API update

4. **Advertisement Management:**
   - User adds/edits ads via AdvertisementManager
   - Changes update local state
   - CRUD operations performed via API service

5. **Preview & PDF Generation:**
   - User clicks Preview to open ProgramPreview
   - Dialog shows formatted program content
   - Generate PDF triggers API call and file download

## Data Flow Diagram

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│  Recital Program    │◄────┤  Recital Program    │◄────┤  API Endpoints      │
│  Components         │     │  Store              │     │                     │
│                     │     │                     │     │                     │
└──────────▲──────────┘     └──────────▲──────────┘     └─────────────────────┘
           │                           │
           │                           │
           │                           │
┌──────────▼──────────┐     ┌──────────▼──────────┐
│                     │     │                     │
│  User Interactions  │     │  Recital Program    │
│  (Edit/Save/etc.)   │────►│  Service            │
│                     │     │                     │
└─────────────────────┘     └─────────────────────┘
```

## Styling Guidelines

Components use a combination of:
- PrimeVue's built-in styling
- Utility classes (Tailwind CSS)
- Custom CSS where needed

Key style classes include:
- Card containers: `card p-4`
- Section headings: `text-xl font-semibold mb-4`
- Form groups: `field mb-4`
- Action buttons: Primary and secondary PrimeVue Button variants

## Implementation Notes

1. **Performance Considerations:**
   - Lazy-load components for better initial loading
   - Use pagination for large performance lists
   - Optimize image loading with proper sizing

2. **Error Handling:**
   - Each component includes comprehensive error handling
   - User-friendly error messages via toast notifications
   - Detailed logging for debugging

3. **Accessibility:**
   - All interactive elements have proper ARIA attributes
   - Color contrast meets WCAG requirements
   - Keyboard navigation support

4. **Mobile Responsiveness:**
   - Responsive grid layouts using Tailwind's grid system
   - Stack layouts on smaller screens
   - Touch-friendly drag and drop

## Testing

Components should be tested using:
- Unit tests for individual component logic
- Integration tests for component interactions
- End-to-end tests for complete workflows

## Next Steps & Future Improvements

1. Component enhancements:
   - Add template selection for program layouts
   - Implement drag-and-drop for cover image positioning
   - Add student quick-change detection

2. UX improvements:
   - Add undo/redo functionality
   - Implement auto-save for all content
   - Add keyboard shortcuts for common actions

3. Performance optimizations:
   - Implement virtual scrolling for long performance lists
   - Add caching for program preview
   - Optimize PDF generation process