<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <main class="flex-grow container mx-auto px-4 py-6">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<script setup>
// Define any layout-specific logic here
</script>