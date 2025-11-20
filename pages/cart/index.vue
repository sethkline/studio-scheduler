<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        <p class="text-gray-600 mt-1">Review your ticket selections</p>
      </div>

      <!-- Cart Summary Component -->
      <CartCartSummary />
    </div>
  </div>
</template>

<script setup lang="ts">
const { cart, isEmpty } = useShoppingCart()

definePageMeta({
  layout: 'default'
})
</script>
