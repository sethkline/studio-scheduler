<template>
  <button
    @click="goToCart"
    class="relative p-2 text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
    :aria-label="`Shopping cart with ${itemCount} items`"
  >
    <i class="pi pi-shopping-cart text-xl"></i>

    <!-- Badge -->
    <span
      v-if="itemCount > 0"
      class="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
    >
      {{ itemCount > 99 ? '99+' : itemCount }}
    </span>
  </button>
</template>

<script setup lang="ts">
const { itemCount } = useShoppingCart()
const router = useRouter()

const goToCart = () => {
  router.push('/cart')
}
</script>
