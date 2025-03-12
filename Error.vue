<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="max-w-lg w-full text-center">
      <h1 class="text-6xl font-bold text-primary-600">{{ error.statusCode }}</h1>
      <p class="text-2xl font-semibold text-gray-800 mt-4">{{ error.message || 'Something went wrong' }}</p>
      <p class="mt-4 text-gray-600">{{ errorDescription }}</p>
      <Button label="Go Back Home" class="mt-6" @click="handleError" />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  error: Object
})

const errorDescription = computed(() => {
  const statusCode = props.error.statusCode
  
  if (statusCode === 404) {
    return "The page you're looking for doesn't exist."
  } else if (statusCode === 403) {
    return "You don't have permission to access this page."
  } else {
    return "We're working on fixing the issue. Please try again later."
  }
})

const handleError = () => {
  clearError({ redirect: '/' })
}
</script>