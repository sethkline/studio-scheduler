<template>
  <div>
    <h2 class="text-2xl font-bold text-center mb-6">Login to your account</h2>
    
    <form @submit.prevent="handleLogin" class="space-y-4">
      <div>
        <label for="email" class="label">Email</label>
        <InputText id="email" v-model="email" type="email" class="w-full" required />
      </div>
      
      <div>
        <label for="password" class="label">Password</label>
        <Password id="password" v-model="password" toggleMask :feedback="false" class="w-full" required />
      </div>
      
      <div v-if="errorMessage" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {{ errorMessage }}
      </div>
      
      <div>
        <Button type="submit" label="Sign in" class="w-full" :loading="loading" />
      </div>
      
      <div class="text-center mt-4">
        <NuxtLink to="/register" class="text-primary-600 hover:text-primary-800">
          Don't have an account? Register
        </NuxtLink>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const client = useSupabaseClient()
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  errorMessage.value = ''
  
  try {
    const { error } = await client.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    
    if (error) {
      errorMessage.value = error.message
    } else {
      navigateTo('/')
    }
  } catch (error) {
    errorMessage.value = 'An unexpected error occurred'
    console.error(error)
  } finally {
    loading.value = false
  }
}
</script>