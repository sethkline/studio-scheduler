<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="max-w-lg w-full text-center">
      <i class="pi pi-lock text-7xl text-red-500"></i>
      <h1 class="text-3xl font-bold text-gray-800 mt-4">Access Denied</h1>
      <p class="mt-4 text-gray-600">
        You don't have permission to access this page. Please contact an administrator if you believe this is an error.
      </p>
      <Button label="Go Back Home" class="mt-6" @click="$router.push('/')" />
    </div>
  </div>
</template>