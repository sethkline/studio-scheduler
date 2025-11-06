<template>
  <div class="min-h-screen flex flex-col bg-white">
    <PublicHeader />
    <main class="flex-1">
      <slot />
    </main>
    <PublicFooter />
  </div>
</template>

<script setup lang="ts">
// Apply theme colors dynamically
const studioStore = useStudioStore()

onMounted(async () => {
  await studioStore.loadProfile()
  applyTheme()
})

const applyTheme = () => {
  const theme = studioStore.profile?.theme
  if (theme?.primary_color) {
    document.documentElement.style.setProperty('--color-primary', theme.primary_color)
  }
  if (theme?.secondary_color) {
    document.documentElement.style.setProperty('--color-secondary', theme.secondary_color)
  }
  if (theme?.accent_color) {
    document.documentElement.style.setProperty('--color-accent', theme.accent_color)
  }
}
</script>

<style>
:root {
  --color-primary: #8b5cf6;
  --color-secondary: #ec4899;
  --color-accent: #f59e0b;
}
</style>
