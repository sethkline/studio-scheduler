/**
 * Design System Configuration
 *
 * Centralizes typography, colors, spacing, and component variants
 * for consistent UI/UX across the application.
 *
 * Based on UX-UI-REVIEW-AND-RECOMMENDATIONS.md
 */

// ============================================================
// TYPOGRAPHY
// ============================================================

export const typography = {
  heading: {
    h1: 'text-[2rem] font-bold text-gray-900 leading-tight', // 32px
    h2: 'text-[1.5rem] font-semibold text-gray-800 leading-tight', // 24px
    h3: 'text-[1.25rem] font-semibold text-gray-700 leading-snug', // 20px
    h4: 'text-[1.125rem] font-semibold text-gray-700 leading-snug', // 18px
  },
  body: {
    base: 'text-[1rem] font-normal text-gray-600', // 16px
    small: 'text-[0.875rem] text-gray-500', // 14px
    caption: 'text-[0.75rem] text-gray-400', // 12px
  },
} as const

// ============================================================
// COLORS - STATUS & FEEDBACK
// ============================================================

export const colors = {
  status: {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-500',
      text: 'text-green-600',
      icon: 'text-green-500',
      hover: 'hover:bg-green-700',
      primary: 'bg-green-600',
    },
    warning: {
      bg: 'bg-orange-50',
      border: 'border-orange-500',
      text: 'text-orange-600',
      icon: 'text-orange-500',
      hover: 'hover:bg-orange-600',
      primary: 'bg-orange-500',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-600',
      icon: 'text-red-500',
      hover: 'hover:bg-red-700',
      primary: 'bg-red-600',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-600',
      icon: 'text-blue-500',
      hover: 'hover:bg-blue-700',
      primary: 'bg-blue-600',
    },
    neutral: {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      text: 'text-gray-500',
      icon: 'text-gray-400',
      hover: 'hover:bg-gray-100',
      primary: 'bg-gray-500',
    },
  },
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
} as const

// ============================================================
// SPACING SCALE
// ============================================================

export const spacing = {
  xs: 'space-1', // 4px
  sm: 'space-2', // 8px
  md: 'space-4', // 16px
  lg: 'space-6', // 24px
  xl: 'space-8', // 32px
  '2xl': 'space-12', // 48px
} as const

export const spacingValues = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const

// ============================================================
// CARD & CONTAINER PATTERNS
// ============================================================

export const containers = {
  card: {
    base: 'bg-white rounded-lg shadow-md border border-gray-200',
    padding: 'p-6',
    hover: 'hover:shadow-lg transition-shadow duration-200',
  },
  panel: {
    base: 'bg-white rounded-lg border border-gray-200',
    padding: 'p-4',
  },
  section: {
    base: 'bg-gray-50 rounded-lg',
    padding: 'p-6',
  },
} as const

// ============================================================
// BUTTON HIERARCHY
// ============================================================

export const buttons = {
  // Base styles shared across all buttons
  base: 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',

  // Size variants
  sizes: {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-2 text-base min-h-[44px]', // WCAG AA touch target
    lg: 'px-6 py-3 text-lg min-h-[48px]', // WCAG AAA touch target
  },

  // Visual variants
  variants: {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 active:scale-95',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500 active:scale-95',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:scale-95',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 active:scale-95',
  },

  // State-specific styles
  states: {
    loading: 'pointer-events-none',
    disabled: 'opacity-50 cursor-not-allowed',
    active: 'scale-95',
  },
} as const

// ============================================================
// FORM INPUT STATES
// ============================================================

export const inputs = {
  base: 'w-full px-4 py-2 text-base border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-1 disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px]',

  states: {
    default: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
    error: 'border-red-500 text-red-600 focus:border-red-500 focus:ring-red-500',
    success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
    disabled: 'bg-gray-100 cursor-not-allowed opacity-60',
  },

  label: 'block text-sm font-medium text-gray-700 mb-1',
  helpText: 'text-sm text-gray-500 mt-1',
  errorText: 'text-sm text-red-600 mt-1 flex items-center gap-1',
} as const

// ============================================================
// TOUCH TARGETS - WCAG COMPLIANCE
// ============================================================

export const touchTargets = {
  minimum: {
    width: 44,
    height: 44,
    classes: 'min-w-[44px] min-h-[44px]', // WCAG AA
  },
  recommended: {
    width: 48,
    height: 48,
    classes: 'min-w-[48px] min-h-[48px]', // WCAG AAA
  },
  spacing: 'space-x-2', // 8px minimum between targets
} as const

// ============================================================
// COMPONENT STATES
// ============================================================

export const componentStates = {
  loading: {
    opacity: 'opacity-75',
    cursor: 'cursor-wait',
    animation: 'animate-pulse',
  },
  disabled: {
    opacity: 'opacity-50',
    cursor: 'cursor-not-allowed',
    pointer: 'pointer-events-none',
  },
  hover: {
    opacity: 'opacity-90',
    scale: 'hover:scale-105',
    shadow: 'hover:shadow-lg',
  },
  focus: {
    ring: 'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    outline: 'focus:outline-none',
  },
  active: {
    scale: 'active:scale-95',
  },
} as const

// ============================================================
// EMPTY STATES
// ============================================================

export const emptyStates = {
  container: 'text-center py-12 px-4',
  icon: 'mx-auto h-12 w-12 text-gray-400 mb-4',
  heading: 'text-lg font-semibold text-gray-900 mb-2',
  description: 'text-sm text-gray-500 mb-6 max-w-md mx-auto',
  action: 'inline-flex items-center justify-center',
} as const

// ============================================================
// MODAL/DIALOG PATTERNS
// ============================================================

export const modal = {
  overlay: 'fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity',
  container: 'fixed inset-0 z-50 overflow-y-auto',
  wrapper: 'flex min-h-full items-center justify-center p-4',
  content: 'relative bg-white rounded-lg shadow-xl max-w-lg w-full',
  header: 'px-6 py-4 border-b border-gray-200',
  body: 'px-6 py-4',
  footer: 'px-6 py-4 border-t border-gray-200 flex justify-end gap-3',
  closeButton: 'absolute top-4 right-4 text-gray-400 hover:text-gray-600',
} as const

// ============================================================
// DATA TABLE PATTERNS
// ============================================================

export const dataTable = {
  wrapper: 'overflow-x-auto shadow-md rounded-lg border border-gray-200',
  table: 'min-w-full divide-y divide-gray-200',
  header: {
    row: 'bg-gray-50 sticky top-0 z-10',
    cell: 'px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider',
  },
  body: {
    row: 'hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-200 last:border-b-0',
    rowStriped: 'odd:bg-white even:bg-gray-50 hover:bg-gray-100',
    cell: 'px-4 py-3 text-sm text-gray-900',
  },
  empty: 'text-center py-12 text-gray-500',
} as const

// ============================================================
// ALERT/TOAST PATTERNS
// ============================================================

export const alerts = {
  base: 'p-4 rounded-lg border-l-4 flex items-start gap-3',

  variants: {
    success: 'bg-green-50 border-green-500 text-green-800',
    error: 'bg-red-50 border-red-500 text-red-800',
    warning: 'bg-orange-50 border-orange-500 text-orange-800',
    info: 'bg-blue-50 border-blue-500 text-blue-800',
  },

  icon: 'flex-shrink-0 w-5 h-5',
  content: 'flex-1',
  title: 'font-semibold mb-1',
  description: 'text-sm',
  closeButton: 'flex-shrink-0 ml-auto text-current opacity-70 hover:opacity-100',
} as const

// ============================================================
// SKELETON LOADING PATTERNS
// ============================================================

export const skeleton = {
  base: 'animate-pulse bg-gray-200 rounded',
  text: 'h-4 bg-gray-200 rounded',
  heading: 'h-8 bg-gray-200 rounded w-1/3 mb-4',
  card: 'bg-white p-6 rounded-lg shadow',
  avatar: 'rounded-full bg-gray-200',
} as const

// ============================================================
// RESPONSIVE BREAKPOINTS
// ============================================================

export const breakpoints = {
  mobile: '640px', // sm
  tablet: '768px', // md
  desktop: '1024px', // lg
  wide: '1280px', // xl
} as const

// ============================================================
// Z-INDEX SCALE
// ============================================================

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const

// ============================================================
// ANIMATION DURATIONS
// ============================================================

export const animations = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  easing: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Combines multiple class strings, filtering out falsy values
 */
export function cn(...classes: (string | boolean | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Gets the full button class string based on variant and size
 */
export function getButtonClasses(
  variant: keyof typeof buttons.variants = 'primary',
  size: keyof typeof buttons.sizes = 'md',
  isLoading?: boolean,
  isDisabled?: boolean
): string {
  return cn(
    buttons.base,
    buttons.sizes[size],
    buttons.variants[variant],
    isLoading && buttons.states.loading,
    isDisabled && buttons.states.disabled
  )
}

/**
 * Gets the full input class string based on state
 */
export function getInputClasses(
  state: keyof typeof inputs.states = 'default',
  isDisabled?: boolean
): string {
  return cn(
    inputs.base,
    inputs.states[state],
    isDisabled && inputs.states.disabled
  )
}

/**
 * Gets alert classes based on variant
 */
export function getAlertClasses(variant: keyof typeof alerts.variants): string {
  return cn(alerts.base, alerts.variants[variant])
}
