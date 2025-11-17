# Design System

This directory contains the centralized design system configuration for the Studio Scheduler application.

## Files

### `design-system.ts`

Central configuration for all UI styling, including:

- **Typography**: Heading scales (H1-H4), body text, small text, captions
- **Colors**: Status colors (success, warning, error, info), primary palette
- **Spacing**: Consistent spacing scale (xs to 2xl)
- **Components**: Pre-configured styles for buttons, inputs, cards, modals, tables, alerts
- **Touch Targets**: WCAG-compliant minimum sizes (44px AA, 48px AAA)
- **Accessibility**: Focus states, keyboard navigation patterns
- **Animations**: Durations and easing functions
- **Helper Functions**: `cn()`, `getButtonClasses()`, `getInputClasses()`, `getAlertClasses()`

## Usage

### Importing

```typescript
import {
  typography,
  colors,
  buttons,
  getButtonClasses
} from '~/lib/design-system'
```

### Using Pre-configured Styles

```vue
<template>
  <h1 :class="typography.heading.h1">Page Title</h1>
  <button :class="getButtonClasses('primary', 'md')">
    Click Me
  </button>
</template>

<script setup>
import { typography, getButtonClasses } from '~/lib/design-system'
</script>
```

### Custom Component Styling

```typescript
import { cn, buttons } from '~/lib/design-system'

const buttonClasses = computed(() => {
  return cn(
    buttons.base,
    buttons.sizes.md,
    buttons.variants.primary,
    props.loading && buttons.states.loading
  )
})
```

## Component Library

All base components use the design system:

- `AppButton` - Buttons with all variants and states
- `AppInput` - Form inputs with validation
- `AppCard` - Container cards
- `AppModal` - Modal dialogs
- `AppAlert` - Notifications and alerts
- `AppEmptyState` - Empty state displays

## Design Principles

1. **Accessibility First**: All components meet WCAG 2.1 AA standards
2. **Consistency**: Centralized configuration ensures UI consistency
3. **Touch-Friendly**: Minimum 44px touch targets on all interactive elements
4. **Keyboard Navigation**: Full keyboard support with visible focus indicators
5. **State Management**: Clear visual feedback for loading, error, success, disabled states
6. **Responsive**: Mobile-first design with proper breakpoints
7. **Performance**: Optimized with skeleton screens and optimistic updates

## Accessibility Features

- **ARIA Labels**: All components include proper ARIA attributes
- **Focus Management**: Logical tab order and visible focus rings
- **Screen Readers**: Semantic HTML and ARIA live regions
- **Keyboard Navigation**: Enter/Space for buttons, Escape for modals
- **Color Contrast**: All text meets 4.5:1 contrast ratio minimum
- **Touch Targets**: Minimum 44x44px with 8px spacing

## Extending the Design System

To add new component patterns:

1. Add configuration to `design-system.ts`
2. Create helper function if needed
3. Export new constants/functions
4. Document usage in this README

Example:

```typescript
// In design-system.ts
export const badges = {
  base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  variants: {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
  }
} as const

export function getBadgeClasses(variant: keyof typeof badges.variants) {
  return cn(badges.base, badges.variants[variant])
}
```

## TypeScript Support

All design system exports are fully typed with TypeScript for autocomplete and type safety.

## Related Documentation

- [UX/UI Review and Recommendations](/docs/tier1/UX-UI-REVIEW-AND-RECOMMENDATIONS.md)
- [Tier 1 Implementation Guides](/docs/tier1/)
