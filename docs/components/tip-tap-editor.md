# TipTapEditor Component Usage Guide

## Overview

The `TipTapEditor` is a powerful rich text editor component based on the TipTap library. It provides a clean interface with essential formatting tools for creating well-structured content in your application.

## Basic Usage

Import and use the component in your Vue components:

```vue
<template>
  <TipTapEditor 
    v-model="myContent" 
    height="320px"
  />
</template>

<script setup>
import { ref } from 'vue'
import TipTapEditor from '@/components/TipTapEditor.vue'

const myContent = ref('<p>Initial content goes here</p>')
</script>
```

## Props

The component accepts the following props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | String | `''` | The HTML content to edit (used with v-model) |
| `editable` | Boolean | `true` | Whether the editor content can be modified |
| `height` | String | `'200px'` | The height of the editor |
| `minHeight` | String | `'100px'` | The minimum height of the editor |
| `maxHeight` | String | `'none'` | The maximum height of the editor |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | String | Emitted when the editor content changes |

## Toolbar Features

The editor comes with a comprehensive toolbar that includes:

### Text Formatting
- **Bold** (B): Make selected text bold
- **Italic** (I): Make selected text italic
- **Underline** (U): Underline selected text
- **Clear Formatting**: Remove all formatting from selected text

### Structure
- **Headings**: Format text as H1 or H2 headings
- **Bullet List**: Create or toggle a bulleted list
- **Ordered List**: Create or toggle a numbered list

### Alignment
- **Align Left**: Left-align text
- **Align Center**: Center text
- **Align Right**: Right-align text

### History
- **Undo**: Revert the last change
- **Redo**: Reapply a previously undone change

## Usage Examples

### Read-Only Mode

For displaying rich text content without allowing edits:

```vue
<template>
  <TipTapEditor 
    v-model="content" 
    :editable="false" 
  />
</template>
```

### Custom Height

Set a custom height for the editor:

```vue
<template>
  <TipTapEditor 
    v-model="content" 
    height="400px" 
    minHeight="200px"
  />
</template>
```

### Form Integration

Integrate with form submission:

```vue
<template>
  <form @submit.prevent="submitForm">
    <div class="form-group">
      <label for="editor">Description</label>
      <TipTapEditor 
        id="editor"
        v-model="formData.description" 
        height="300px"
      />
    </div>
    <button type="submit">Submit</button>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import TipTapEditor from '@/components/TipTapEditor.vue'

const formData = ref({
  description: '<p>Enter a detailed description...</p>'
})

function submitForm() {
  // Form submission logic
  console.log('Submitting description:', formData.value.description)
}
</script>
```

### Two-Way Binding with Auto-Save

Implement auto-save functionality:

```vue
<template>
  <TipTapEditor 
    v-model="noteContent" 
    height="250px"
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import TipTapEditor from '@/components/TipTapEditor.vue'

const noteContent = ref('<p>This is an auto-saving note</p>')

// Auto-save when content changes
let saveTimeout = null
watch(noteContent, (newContent) => {
  if (saveTimeout) clearTimeout(saveTimeout)
  
  saveTimeout = setTimeout(() => {
    saveToDatabase(newContent)
  }, 2000) // Auto-save after 2 seconds of inactivity
})

function saveToDatabase(content) {
  console.log('Saving to database:', content)
  // API call to save content
}

// Clean up
onBeforeUnmount(() => {
  if (saveTimeout) clearTimeout(saveTimeout)
})
</script>
```

## Styling

The TipTapEditor includes default styling that integrates with your application's theme. You can customize its appearance by targeting the appropriate CSS classes.

### Example Custom Styling

```css
/* Make the toolbar buttons more prominent */
#toolbar button {
  padding: 0.5rem 0.75rem;
  margin-right: 0.5rem;
}

/* Style the editor content area */
:deep(.tiptap) {
  font-family: 'Georgia', serif;
  line-height: 1.6;
}

/* Style headings in the editor */
:deep(.tiptap h1) {
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}

:deep(.tiptap h2) {
  color: #3498db;
}
```

## Best Practices

1. **Initial Content**: Always provide well-formed HTML as initial content to avoid rendering issues.

2. **HTML Sanitization**: The editor automatically sanitizes HTML to prevent XSS attacks, but you should still validate content on the server side.

3. **Performance**: For very large documents, consider using a fixed height with overflow to improve performance.

4. **Accessibility**: The editor supports keyboard navigation for most operations. Encourage users to utilize keyboard shortcuts.

5. **Content Validation**: If you need to enforce specific content structures, consider validating the HTML output before submission.

## Troubleshooting

### Common Issues

1. **Content not updating**: Ensure you're using v-model correctly and that the content is valid HTML.

2. **Formatting issues**: Check that your initial content is well-formed HTML.

3. **Editor height problems**: Set explicit height, minHeight, and maxHeight props to control the editor's dimensions.

4. **Styling conflicts**: If your application's global CSS interferes with the editor, use more specific selectors to override the styles.

### Debugging

To debug editor content issues, you can log the HTML output:

```vue
<script setup>
watch(content, (newContent) => {
  console.log('Editor content:', newContent)
})
</script>
```