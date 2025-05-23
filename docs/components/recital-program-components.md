# Recital Program Management Components Documentation

## Overview

This documentation provides a comprehensive guide to the components that implement the Recital Program Management feature. These components enable studio administrators to create, manage, and generate professional recital programs that include performance details, participant lists, artistic notes, acknowledgments, and promotional content.

## Component Architecture

The feature follows a hierarchical component structure:

```
RecitalProgramManager (Container)
├── PerformanceOrderManager
├── ProgramContentEditor
├── CoverImageUploader
├── AdvertisementManager
└── ProgramPreview (Modal)
```

## Core Components

### 1. RecitalProgramManager

**File Location:** `components/recital/RecitalProgramManager.vue`

**Purpose:** Main container component that orchestrates the entire program management experience, including tab navigation and common actions.

**Props:**
- `recitalId` (String, required): UUID of the recital

**Key Features:**
- Tabbed interface for organizing different program aspects
- Loading and saving program data
- PDF generation initiation
- Program preview functionality

**Dependencies:**
- PrimeVue TabView component
- Recital Program Store
- Child components for each program section

**Usage Example:**
```html
<RecitalProgramManager recitalId="123e4567-e89b-12d3-a456-426614174000" />
```

### 2. PerformanceOrderManager

**File Location:** `components/recital/PerformanceOrderManager.vue`

**Purpose:** Handles the ordering and editing of performances within the recital program.

**Props:**
- `performances` (Array, required): List of performances
- `loading` (Boolean): Loading state indicator

**Events:**
- `save`: Emitted when performance order is updated
- `update-performance`: Emitted when a performance's details are updated

**Key Features:**
- Drag-and-drop reordering interface
- Performance details display
- Edit performance dialog
- View dancers dialog
- Automatic performance numbering

**Dependencies:**
- PrimeVue OrderList, Dialog, and DataTable components
- Supabase client for fetching dancers

**Technical Notes:**
- Uses OrderList component for drag-and-drop functionality
- Manages local state for editing to prevent premature API calls
- Tracks original order to detect changes

### 3. ProgramContentEditor

**File Location:** `components/recital/ProgramContentEditor.vue`

**Purpose:** Provides rich text editing for artistic director's note and acknowledgments.

**Props:**
- `programContent` (Object, required): Program content data
  - `artisticDirectorNote` (String): HTML content for director's note
  - `acknowledgments` (String): HTML content for acknowledgments
- `loading` (Boolean): Loading state indicator

**Events:**
- `save`: Emitted when content is updated, with an object containing the updated content

**Key Features:**
- Rich text editing with formatting options
- Auto-save functionality with 2-second debounce
- Side-by-side editors for director's note and acknowledgments
- Responsive grid layout that stacks on mobile devices

**Dependencies:**
- TipTapEditor component for rich text editing
- PrimeVue Button component for save action

**Technical Notes:**
- Implements debounced auto-save for better user experience
- Tracks changes to prevent unnecessary API calls
- Rich text content is stored as HTML
- Uses TipTap editor extensions for text formatting and alignment

**Sub-Components:**

#### TipTapEditor

**File Location:** `components/TipTapEditor.vue`

**Purpose:** Reusable rich text editor component based on TipTap.

**Props:**
- `modelValue` (String): Editor content in HTML format
- `editable` (Boolean, default: true): Whether the editor is editable
- `height` (String, default: '200px'): Editor height
- `minHeight` (String, default: '100px'): Editor minimum height
- `maxHeight` (String, default: 'none'): Editor maximum height

**Events:**
- `update:modelValue`: Emitted when editor content changes

**Key Features:**
- Toolbar with formatting options (bold, italic, underline)
- Heading options (H1, H2)
- Text alignment controls
- List formatting (bulleted and ordered)
- Undo/redo functionality

**Dependencies:**
- TipTap Vue 3 packages (@tiptap/vue-3, @tiptap/starter-kit)
- TipTap extensions (@tiptap/extension-underline, @tiptap/extension-text-align, @tiptap/extension-highlight)
- PrimeVue Button, Toolbar components

**Technical Notes:**
- Implements v-model compatible interface
- Watches for external content changes
- Properly cleans up editor instance on component unmount
- Custom styling for editor and toolbar

**File Location:** `components/recital/ProgramContentEditor.vue`

**Purpose:** Provides rich text editing for artistic director's note and acknowledgments.

**Props:**
- `programContent` (Object, required): Program content data
- `loading` (Boolean): Loading state indicator

**Events:**
- `save`: Emitted when content is updated

**Key Features:**
- Rich text editing with formatting options
- Auto-save functionality
- Side-by-side editors for director's note and acknowledgments

**Dependencies:**
- PrimeVue Editor component for rich text editing

**Technical Notes:**
- Implements debounced auto-save for better user experience
- Tracks changes to prevent unnecessary API calls
- Rich text content is stored as HTML

### 4. CoverImageUploader

**File Location:** `components/recital/CoverImageUploader.vue`

**Purpose:** Handles the upload, preview, and management of the program cover image.

**Props:**
- `coverImage` (String): Original cover image URL from Supabase
- `coverImageProxy` (String): Proxied cover image URL for display
- `loading` (Boolean): Loading state indicator

**Events:**
- `upload`: Emitted when a new image is uploaded, with the file as payload
- `remove`: Emitted when the current image is removed

**Key Features:**
- Image file upload with validation
- Image preview with CSP-compliant URLs
- Remove option
- File type and size validation
- Guidance for optimal image dimensions

**Dependencies:**
- PrimeVue FileUpload component
- Image proxy service for CSP-compliant image display

**Technical Notes:**
- Validates file types (JPG, PNG, WEBP)
- Enforces 5MB file size limit
- Creates local previews before actual upload
- Uses proxied image URLs to avoid CSP restrictions
- Includes detailed image guidelines for users

### 5. AdvertisementManager

**File Location:** `components/recital/AdvertisementManager.vue`

**Purpose:** Manages the program advertisements including creation, editing, and ordering.

**Props:**
- `advertisements` (Array): Current advertisements
- `loading` (Boolean): Loading state indicator

**Events:**
- `add`: Emitted when adding a new advertisement
- `update`: Emitted when updating an existing advertisement
- `delete`: Emitted when deleting an advertisement

**Key Features:**
- Grid display of current advertisements with proper sorting
- Add/edit advertisement dialog with form validation
- Reordering capabilities with up/down buttons
- Image upload handling with preview
- Delete confirmation before removing advertisements
- Responsive grid layout that adapts to screen size

**Dependencies:**
- PrimeVue UI components (Button, Dialog, InputText, Textarea, InputNumber, FileUpload, Message, ConfirmDialog)
- PrimeVue Forms library for form validation
- Zod for schema validation
- ConfirmDialog service for deletion confirmation

**Technical Notes:**
- Uses PrimeVue Forms with Zod schema validation for form handling
- Implements validation for required fields and input constraints
- Manages advertisement ordering with explicit position numbers
- Handles image upload with preview and client-side validation
- Supports FormData for multipart uploads
- Uses computed properties for sorted advertisement display

**Form Validation Implementation:**
```javascript
// Create a zod schema for form validation
const adSchema = z.object({
  title: z.string().min(1, "Advertisement title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().optional(),
  order_position: z.number().min(1, "Position must be at least 1")
});

// Create a resolver using the zod schema
const formResolver = zodResolver(adSchema);
```

**Form Structure:**
- The form is implemented using PrimeVue's Form component
- Form fields are connected to the validation schema via the 'name' attribute
- Error messages are displayed conditionally using the form state
- Submit handler processes the validated form data for API submission

**File Location:** `components/recital/AdvertisementManager.vue`

**Purpose:** Manages the program advertisements including creation, editing, and ordering.

**Props:**
- `advertisements` (Array): Current advertisements
- `loading` (Boolean): Loading state indicator

**Events:**
- `add`: Emitted when adding a new advertisement
- `update`: Emitted when updating an existing advertisement
- `delete`: Emitted when deleting an advertisement

**Key Features:**
- Grid display of current advertisements
- Add/edit advertisement dialog
- Reordering capabilities
- Image upload handling
- Delete confirmation

**Dependencies:**
- PrimeVue Dialog, FileUpload, and ConfirmDialog components
- Vuelidate for form validation

**Technical Notes:**
- Implements form validation for required fields
- Manages ordering with explicit position numbers
- Handles image preview and validation
- Supports FormData for multipart uploads

### 6. ProgramPreview

**File Location:** `components/recital/ProgramPreview.vue`

**Purpose:** Provides a preview of how the final program will appear when generated as a PDF.

**Props:**
- `recital` (Object): Recital data
- `program` (Object): Program metadata and content
- `performances` (Array): Performance data
- `advertisements` (Array): Advertisement data

**Events:**
- `generate-pdf`: Emitted when user requests PDF generation

**Key Features:**
- Page-by-page preview
- Visual representation matching final PDF
- Navigation between program sections
- Renders rich text content

**Dependencies:**
- Custom styling to simulate PDF pages
- PrimeVue Button components for navigation

**Technical Notes:**
- Uses fixed aspect ratio to simulate letter-sized pages
- Renders HTML content from rich text editors
- Organizes content into logical program sections

## State Management

### Recital Program Store

**File Location:** `stores/recitalProgramStore.js`

**Purpose:** Centralizes state management for the recital program feature, handling API calls and local state updates.

**Key State:**
- `recital`: Current recital data
- `program`: Program metadata and content
- `performances`: Array of performances
- `advertisements`: Array of advertisements
- `loading`: Loading states for different operations
- `error`: Error messages

**Key Actions:**
- `fetchProgram(recitalId)`: Load all program data
- `savePerformanceOrder(recitalId, performances)`: Save new performance order
- `updatePerformance(recitalId, performanceId, performanceData)`: Update a performance
- `saveProgramContent(recitalId, content)`: Save program content
- `uploadCoverImage(recitalId, imageFile)`: Upload cover image
- `addAdvertisement(recitalId, advertisementData)`: Add advertisement
- `updateAdvertisement(recitalId, adId, advertisementData)`: Update advertisement
- `deleteAdvertisement(recitalId, adId)`: Delete advertisement
- `generatePdf(recitalId)`: Generate and download PDF

**Technical Notes:**
- Uses Pinia for state management
- Integrates with the API service composable
- Handles error states and loading indicators
- Maintains sorted lists for performances and advertisements

## Service Layer

### Recital Program Service

**File Location:** `composables/useRecitalProgramService.js`

**Purpose:** Provides a clean API for interacting with recital program endpoints.

**Key Methods:**
- `fetchRecitalProgram(recitalId)`: Get program data
- `updateProgramDetails(recitalId, programData)`: Update program details
- `uploadCoverImage(recitalId, imageFile)`: Upload cover image
- `addAdvertisement(recitalId, advertisementData)`: Add advertisement
- `updateAdvertisement(recitalId, adId, advertisementData)`: Update advertisement
- `deleteAdvertisement(recitalId, adId)`: Delete advertisement
- `reorderPerformances(recitalId, performanceOrder)`: Update performance order
- `updatePerformance(recitalId, performanceId, performanceData)`: Update performance details
- `updateArtisticNote(recitalId, note)`: Update artistic director's note
- `updateAcknowledgments(recitalId, acknowledgments)`: Update acknowledgments
- `generateProgramPDF(recitalId)`: Generate and download PDF

**Technical Notes:**
- Uses Nuxt's `useFetch` for API calls
- Handles form data for file uploads
- Returns consistent response format

## Testing Strategy

### Unit Tests

Unit tests should verify the correct behavior of individual components, focusing on their business logic and state management.

**Key Areas to Test:**
- State transitions
- Component methods
- Store actions and mutations
- Event handling
- Validation logic

**Example Test Files:**
- `RecitalProgramManager.spec.js`
- `PerformanceOrderManager.spec.js` 
- `recitalProgramStore.spec.js`

### Component Tests

Component tests verify that components render and behave correctly, including interactions with child components.

**Key Areas to Test:**
- Component rendering with different props
- User interactions (clicks, drags, form submissions)
- Dialog behavior
- Loading and error states
- Component integration

**Example Test Files:**
- `AdvertisementManager.spec.js`
- `ProgramContentEditor.spec.js`
- `CoverImageUploader.spec.js`

### Integration Tests

Integration tests verify that components work together correctly, with a focus on data flow and API interactions.

**Key Areas to Test:**
- End-to-end workflows (creating, editing, publishing)
- API interactions
- Store integration
- Error handling
- PDF generation

**Example Test Files:**
- `recitalProgramWorkflow.spec.js`
- `programGeneration.spec.js`

## Implementation Roadmap

1. **Database schema implementation**
   - Add recital_programs table
   - Add recital_program_advertisements table
   - Update recital_performances table

2. **API endpoints implementation**
   - Implement GET/POST/PUT endpoints for program data
   - Add file upload endpoints for cover image and advertisements
   - Implement PDF generation endpoint

3. **Core components implementation**
   - Develop RecitalProgramManager container component
   - Implement PerformanceOrderManager and ProgramContentEditor
   - Build CoverImageUploader and AdvertisementManager
   - Create ProgramPreview component

4. **Store and service implementation**
   - Develop recitalProgramStore
   - Implement useRecitalProgramService composable
   - Connect components to store

5. **Testing and quality assurance**
   - Write unit tests for core functionality
   - Create component tests for UI behavior
   - Implement integration tests for workflows
   - Perform manual testing and bug fixes

6. **Documentation and deployment**
   - Create component documentation
   - Update API documentation
   - Deploy to staging environment
   - Release to production

## Best Practices

1. **State Management**
   - Use the store for shared state across components
   - Keep local state for UI-specific behavior
   - Update store after successful API calls

2. **Error Handling**
   - Display user-friendly error messages
   - Log detailed errors for debugging
   - Handle API errors consistently
   - Provide fallback UI for error states

3. **Performance Optimization**
   - Lazy load components when possible
   - Optimize image loading and processing
   - Implement pagination for large lists
   - Debounce input handlers and auto-save functions

4. **Accessibility**
   - Use semantic HTML where appropriate
   - Ensure keyboard navigation works properly
   - Add appropriate ARIA attributes
   - Maintain sufficient color contrast

5. **Code Organization**
   - Follow consistent naming conventions
   - Group related functionality
   - Document complex logic with comments
   - Extract reusable logic into composables