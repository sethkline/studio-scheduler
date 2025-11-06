import type { StudioTheme } from '~/types/studio'

export function useTheme() {
  const studioStore = useStudioStore()

  const theme = computed(() => studioStore.profile?.theme)

  const applyTheme = (customTheme?: StudioTheme) => {
    const themeToApply = customTheme || theme.value || {}

    const root = document.documentElement

    // Apply primary color
    if (themeToApply.primary_color) {
      root.style.setProperty('--color-primary', themeToApply.primary_color)
      root.style.setProperty('--color-primary-rgb', hexToRgb(themeToApply.primary_color))
    }

    // Apply secondary color
    if (themeToApply.secondary_color) {
      root.style.setProperty('--color-secondary', themeToApply.secondary_color)
      root.style.setProperty('--color-secondary-rgb', hexToRgb(themeToApply.secondary_color))
    }

    // Apply accent color
    if (themeToApply.accent_color) {
      root.style.setProperty('--color-accent', themeToApply.accent_color)
      root.style.setProperty('--color-accent-rgb', hexToRgb(themeToApply.accent_color))
    }
  }

  const hexToRgb = (hex: string): string => {
    // Remove # if present
    hex = hex.replace('#', '')

    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    return `${r}, ${g}, ${b}`
  }

  const getContrastColor = (hexColor: string): 'light' | 'dark' => {
    const rgb = hexToRgb(hexColor)
    const [r, g, b] = rgb.split(',').map(Number)

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    return luminance > 0.5 ? 'dark' : 'light'
  }

  return {
    theme,
    applyTheme,
    getContrastColor,
  }
}
