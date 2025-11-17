# Common Components

Reusable UI components that implement the design system and accessibility standards.

## Components

### AppButton

Fully accessible button component with multiple variants and states.

**Features:**
- Multiple variants: primary, secondary, danger, ghost, success
- Three sizes: sm (36px), md (44px), lg (48px)
- Loading state with spinner
- Disabled state
- Full keyboard navigation (Enter, Space)
- Icon support (leading and trailing)

**Usage:**

```vue
<template>
  <!-- Primary button -->
  <AppButton variant="primary" @click="handleSave">
    Save Changes
  </AppButton>

  <!-- Loading state -->
  <AppButton variant="primary" :loading="isSaving" @click="handleSave">
    Save Changes
  </AppButton>

  <!-- With icon -->
  <AppButton variant="danger" @click="handleDelete">
    <template #icon>
      <TrashIcon class="h-4 w-4" />
    </template>
    Delete
  </AppButton>

  <!-- Full width -->
  <AppButton variant="secondary" full-width>
    Cancel
  </AppButton>
</template>

<script setup>
const isSaving = ref(false)

async function handleSave() {
  isSaving.value = true
  await saveData()
  isSaving.value = false
}
</script>
```

---

### AppInput

Accessible text input with validation states and error messages.

**Features:**
- Multiple input types (text, email, password, tel, number, date, etc.)
- Validation states (default, error, success)
- Help text and error messages
- Icon support (leading and trailing)
- Auto-validation icons (checkmark for success, exclamation for error)
- Required field indicator

**Usage:**

```vue
<template>
  <!-- Basic input -->
  <AppInput
    v-model="email"
    label="Email Address"
    type="email"
    placeholder="name@example.com"
    required
  />

  <!-- With help text -->
  <AppInput
    v-model="phone"
    label="Phone Number"
    type="tel"
    help-text="We'll send confirmation via SMS"
  />

  <!-- With validation -->
  <AppInput
    v-model="password"
    label="Password"
    type="password"
    :error-message="passwordError"
    @blur="validatePassword"
  />

  <!-- With icon -->
  <AppInput
    v-model="search"
    label="Search"
    placeholder="Search students..."
  >
    <template #iconLeft>
      <MagnifyingGlassIcon class="h-5 w-5" />
    </template>
  </AppInput>
</template>

<script setup>
const email = ref('')
const passwordError = ref('')

function validatePassword() {
  if (password.value.length < 8) {
    passwordError.value = 'Password must be at least 8 characters'
  } else {
    passwordError.value = ''
  }
}
</script>
```

---

### AppCard

Container component for grouping related content.

**Features:**
- Optional header with title
- Flexible body content
- Optional footer
- Hover effect (optional)
- Clickable state (optional)

**Usage:**

```vue
<template>
  <!-- Basic card -->
  <AppCard title="Student Details">
    <p>Card content goes here</p>
  </AppCard>

  <!-- With header actions -->
  <AppCard title="Rehearsal Schedule">
    <template #actions>
      <AppButton size="sm" @click="handleEdit">Edit</AppButton>
    </template>
    <template #default>
      <p>Rehearsal details...</p>
    </template>
    <template #footer>
      <AppButton variant="secondary">Cancel</AppButton>
      <AppButton variant="primary">Save</AppButton>
    </template>
  </AppCard>

  <!-- Clickable card -->
  <AppCard hoverable clickable @click="handleCardClick">
    <h3>Click me!</h3>
  </AppCard>
</template>
```

---

### AppModal

Fully accessible modal dialog component.

**Features:**
- Focus trap (keeps focus inside modal)
- Escape key to close
- Click outside to close (optional)
- Body scroll lock when open
- Multiple sizes (sm, md, lg, xl, full)
- ARIA attributes for screen readers

**Usage:**

```vue
<template>
  <AppButton @click="showModal = true">Open Modal</AppButton>

  <AppModal v-model="showModal" title="Delete Rehearsal" size="sm">
    <p>Are you sure you want to delete this rehearsal? This action cannot be undone.</p>

    <template #footer>
      <AppButton variant="secondary" @click="showModal = false">
        Cancel
      </AppButton>
      <AppButton variant="danger" @click="handleDelete">
        Delete Rehearsal
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup>
const showModal = ref(false)

async function handleDelete() {
  await deleteRehearsal()
  showModal.value = false
}
</script>
```

---

### AppAlert

Display informational, success, warning, or error messages.

**Features:**
- Multiple variants (success, error, warning, info)
- Optional title and description
- Dismissible with close button
- Auto-dismiss with timeout
- Smooth fade transitions
- ARIA live regions for accessibility

**Usage:**

```vue
<template>
  <!-- Success alert -->
  <AppAlert
    variant="success"
    title="Payment received"
    description="Receipt sent to parent@example.com"
    dismissible
  />

  <!-- Error with auto-dismiss -->
  <AppAlert
    variant="error"
    dismissible
    :auto-dismiss="5000"
  >
    Failed to send email - Check connection
  </AppAlert>

  <!-- Controlled visibility -->
  <AppAlert
    v-model="showAlert"
    variant="info"
    title="New feature available"
  >
    <p>You can now schedule rehearsals!</p>
    <AppButton size="sm" @click="handleLearnMore">Learn More</AppButton>
  </AppAlert>
</template>

<script setup>
const showAlert = ref(true)
</script>
```

---

### AppEmptyState

Display empty states when lists or sections have no data.

**Features:**
- Customizable icon
- Clear heading and description
- Primary and secondary action slots
- Consistent styling

**Usage:**

```vue
<template>
  <AppEmptyState
    heading="No rehearsals scheduled"
    description="Get started by creating your first rehearsal for this show"
  >
    <template #icon>
      <CalendarIcon class="h-12 w-12" />
    </template>
    <template #action>
      <AppButton variant="primary" @click="createRehearsal">
        Create Rehearsal
      </AppButton>
    </template>
    <template #secondaryAction>
      <AppButton variant="ghost" @click="viewGuide">
        View Setup Guide
      </AppButton>
    </template>
  </AppEmptyState>
</template>
```

---

## Accessibility Guidelines

All components implement WCAG 2.1 AA standards:

1. **Keyboard Navigation**: Full support for Tab, Enter, Space, Escape keys
2. **Focus Management**: Visible focus indicators on all interactive elements
3. **ARIA Labels**: Proper labels for screen readers
4. **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
5. **Touch Targets**: Minimum 44x44px for all interactive elements
6. **Error Handling**: Clear, actionable error messages with recovery options

## Component States

All components support these states:

- **Default**: Normal state
- **Hover**: Visual feedback on mouse over
- **Focus**: Keyboard navigation indicator
- **Active**: Pressed/clicked state
- **Disabled**: Non-interactive state
- **Loading**: Processing state with spinner
- **Error**: Validation error state
- **Success**: Validation success state

## Best Practices

1. **Use semantic variants**: `variant="danger"` for destructive actions, `variant="primary"` for main CTAs
2. **Provide ARIA labels**: For icon-only buttons, use `aria-label` prop
3. **Show loading states**: Always show `loading` state during async operations
4. **Clear error messages**: Use specific, actionable error messages
5. **Consistent sizing**: Use `size="md"` (44px) for most buttons to meet WCAG AA
6. **Auto-focus**: Use sparingly, only for modal dialogs
7. **Dismissible alerts**: Allow users to dismiss non-critical alerts

## Related Files

- [Design System Configuration](/lib/design-system.ts)
- [Tier 1 Feature Types](/types/tier1-features.ts)
