# Forms Component Pattern Documentation

## Overview

This documentation outlines the standardized approach for implementing forms within the dance studio application using PrimeVue's Forms library with Zod schema validation. This pattern ensures consistency, improves code maintainability, and enhances user experience through better validation handling.

## Form Components Architecture

Our form implementation follows this structure:

1. **Form Container** - Wraps form fields and manages validation
2. **Form Fields** - Individual input components connected to the Form
3. **Error Messages** - Conditional display of validation errors
4. **Actions** - Standardized submit/cancel buttons

## Core Technologies

- **PrimeVue Forms** - Provides the core form state management
- **Zod** - Schema validation library for type-safe validation
- **PrimeVue Components** - UI components for form inputs
- **TypeScript** - Type safety for form data

## Implementation Pattern

### 1. Form Setup

Every form follows this basic structure:

```vue
<template>
  <Form 
    v-slot="$form" 
    :initialValues="initialData"
    :resolver="formResolver"
    @submit="onSubmit"
    class="space-y-4"
  >
    <!-- Form fields -->
    
    <!-- Form actions -->
  </Form>
</template>

<script setup lang="ts">
import { Form } from '@primevue/forms';
import { z } from 'zod';
import { zodResolver } from '@primevue/forms/resolvers/zod';

// Create Zod schema
const formSchema = z.object({
  field1: z.string().min(1, 'Field is required'),
  field2: z.string().optional(),
  // Additional fields...
});

// Create resolver
const formResolver = zodResolver(formSchema);

// Submit handler
function onSubmit(event) {
  const { values, valid } = event;
  if (valid) {
    // Process form submission
  }
}
</script>
```

### 2. Form Field Pattern

Each form field follows this consistent pattern:

```vue
<div class="field">
  <label for="fieldName" class="font-medium text-sm mb-1 block">Field Label*</label>
  <InputComponent 
    id="fieldName" 
    name="fieldName"
    class="w-full" 
    aria-describedby="fieldName-error"
  />
  <Message 
    v-if="$form.fieldName?.invalid" 
    severity="error" 
    size="small" 
    variant="simple"
  >
    {{ $form.fieldName.error?.message }}
  </Message>
</div>
```

### 3. Form Actions

Standard form actions are consistent across all forms:

```vue
<div class="flex justify-end gap-2 pt-4">
  <Button 
    type="button" 
    label="Cancel" 
    class="p-button-text" 
    @click="$emit('cancel')"
    :disabled="loading"
  />
  <Button 
    type="submit" 
    label="Save" 
    icon="pi pi-save"
    :loading="loading"
  />
</div>
```

## Schema Validation with Zod

Zod provides a powerful type-safe validation system. Here are common patterns used in our forms:

### Basic Validations

```javascript
const schema = z.object({
  // Required string with minimum length
  name: z.string().min(1, 'Name is required'),
  
  // Required string with specific format
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  
  // Optional string
  description: z.string().optional(),
  
  // Number with min/max
  age: z.number().min(0, 'Age cannot be negative').max(120, 'Age is too high'),
  
  // Boolean
  isActive: z.boolean(),
  
  // Date
  eventDate: z.string().min(1, 'Date is required')
});
```

### Custom Validations

For more complex validations, we use Zod's refinement capabilities:

```javascript
const schema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .refine(
      password => /[A-Z]/.test(password),
      'Password must contain at least one uppercase letter'
    )
    .refine(
      password => /[0-9]/.test(password),
      'Password must contain at least one number'
    )
});
```

## Data Transformations

For components that need value transformations (like Calendar), we use the formControl transform property:

```vue
<Calendar 
  name="date"
  :formControl="{
    transform: {
      input: stringToDate,   // Transform for display
      output: dateToString   // Transform for form data
    }
  }"
/>
```

With corresponding transformation functions:

```javascript
function stringToDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  return new Date(dateStr);
}

function dateToString(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}
```

## Form State Management

The PrimeVue Form component exposes a `$form` object through v-slot that contains all form state information:

- `$form.valid` - Overall form validity
- `$form.fieldName.value` - Value of a specific field
- `$form.fieldName.valid` - Validity of a specific field
- `$form.fieldName.error` - Error object for a specific field
- `$form.fieldName.dirty` - Whether the field has been changed
- `$form.fieldName.touched` - Whether the field has been interacted with

## Common Form Components

| Component      | Purpose                                        | Validation Example                           |
|----------------|------------------------------------------------|---------------------------------------------|
| InputText      | Single-line text input                         | `z.string().min(1, 'Field is required')`    |
| Textarea       | Multi-line text input                          | `z.string().optional()`                     |
| InputNumber    | Numeric input with formatting                  | `z.number().min(0, 'Must be positive')`     |
| Dropdown       | Selection from predefined options              | `z.string().min(1, 'Selection required')`   |
| MultiSelect    | Multiple selection from options                | `z.array(z.string()).min(1, 'Required')`    |
| Calendar       | Date selection                                 | `z.string().min(1, 'Date required')`        |
| Checkbox       | Boolean selection                              | `z.boolean()`                               |
| RadioButton    | Single selection from options                  | `z.string().min(1, 'Selection required')`   |
| FileUpload     | File selection and upload                      | Custom file validation                       |

## Best Practices

1. **Consistent Field Structure**
   - All form fields should follow the same pattern
   - Always use explicit labels
   - Use consistent spacing (space-y-4 for forms, field class for each field)

2. **Validation Messages**
   - Clear and actionable error messages
   - Consistent display using Message component
   - Show validation only after interaction (using touched/dirty state)

3. **Accessibility**
   - Associate labels with inputs using 'for' and 'id'
   - Use aria-describedby to connect inputs with error messages
   - Mark required fields with asterisk (*)
   - Ensure proper tab order

4. **Responsive Design**
   - All forms should be fully responsive
   - Use w-full on inputs for consistent width
   - Ensure proper spacing on mobile devices

5. **Loading States**
   - Disable form controls during submission
   - Show loading indicators on primary action buttons
   - Prevent multiple submissions

## Form Migration Guide

To migrate from Vuelidate to PrimeVue Forms + Zod:

1. **Replace Form Structure**
   - Wrap form content in `<Form>` component
   - Add v-slot="$form" to access form state
   - Set initialValues prop to your initial data object
   - Add submit handler to @submit event

2. **Replace Validation Logic**
   - Create Zod schema for validation rules
   - Use zodResolver to create form resolver
   - Update error message display to use $form state

3. **Update Form Fields**
   - Replace v-model bindings with name attributes
   - Remove :class conditionals based on Vuelidate
   - Update error message display pattern

4. **Update Form Submission**
   - Update submit handler to use Form submit event
   - Extract values and validity from event object

## Example Components

The following form components follow this pattern:

1. **RecitalForm** - Creating and editing recitals
2. **AdvertisementManager** - Managing program advertisements
3. **StudentRegistrationForm** - Student enrollment
4. **ScheduleClassForm** - Class scheduling
5. **TeacherForm** - Teacher information management

## Troubleshooting

### Common Issues and Solutions

1. **Form not validating properly**
   - Check that all field names match your schema properties
   - Ensure resolver is properly configured
   - Verify Zod schema has correct validation rules

2. **Values not updating**
   - Make sure each field has a name attribute
   - Check initialValues are properly set
   - Verify transform functions if used

3. **Custom components not working**
   - Use FormField wrapper for custom components
   - Implement proper v-model or controlled state

4. **Date handling issues**
   - Use transform functions for proper conversion
   - Ensure consistent date format throughout the application