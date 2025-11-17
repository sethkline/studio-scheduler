<script setup lang="ts">
import type { CustomerInfo } from '~/types/ticketing'
import { useField, useForm } from 'vee-validate'
import * as yup from 'yup'

interface Props {
  initialValues?: CustomerInfo
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  submit: [customerInfo: CustomerInfo]
  update: [customerInfo: CustomerInfo]
}>()

// Validation schema
const schema = yup.object({
  name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters'),
  email: yup.string().required('Email is required').email('Invalid email address'),
  phone: yup
    .string()
    .nullable()
    .matches(/^[\d\s\-()]+$/, 'Invalid phone number')
})

// Form setup
const { handleSubmit, errors, values } = useForm({
  validationSchema: schema,
  initialValues: props.initialValues || {
    name: '',
    email: '',
    phone: ''
  }
})

// Individual fields
const { value: name } = useField<string>('name')
const { value: email } = useField<string>('email')
const { value: phone } = useField<string>('phone')

// Watch for changes and emit updates
watch(
  () => values,
  (newValues) => {
    if (newValues.name && newValues.email) {
      emit('update', newValues as CustomerInfo)
    }
  },
  { deep: true }
)

// Submit handler
const onSubmit = handleSubmit((values) => {
  emit('submit', values as CustomerInfo)
})

// Expose submit method to parent
defineExpose({
  submit: onSubmit,
  values
})
</script>

<template>
  <Card class="mb-4">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-user text-primary-600"></i>
        <h2 class="text-xl font-semibold text-gray-900">Customer Information</h2>
      </div>
    </template>

    <template #content>
      <form @submit.prevent="onSubmit" class="space-y-4">
        <!-- Name Field -->
        <div class="flex flex-col gap-2">
          <label for="customer-name" class="text-sm font-medium text-gray-700">
            Full Name <span class="text-red-500">*</span>
          </label>
          <InputText
            id="customer-name"
            v-model="name"
            :disabled="disabled"
            :invalid="!!errors.name"
            placeholder="John Doe"
            class="w-full"
          />
          <small v-if="errors.name" class="text-red-500">{{ errors.name }}</small>
        </div>

        <!-- Email Field -->
        <div class="flex flex-col gap-2">
          <label for="customer-email" class="text-sm font-medium text-gray-700">
            Email Address <span class="text-red-500">*</span>
          </label>
          <InputText
            id="customer-email"
            v-model="email"
            :disabled="disabled"
            :invalid="!!errors.email"
            type="email"
            placeholder="john.doe@example.com"
            class="w-full"
          />
          <small v-if="errors.email" class="text-red-500">{{ errors.email }}</small>
          <small v-else class="text-gray-500">
            Your tickets will be sent to this email address
          </small>
        </div>

        <!-- Phone Field (Optional) -->
        <div class="flex flex-col gap-2">
          <label for="customer-phone" class="text-sm font-medium text-gray-700">
            Phone Number (Optional)
          </label>
          <InputText
            id="customer-phone"
            v-model="phone"
            :disabled="disabled"
            :invalid="!!errors.phone"
            type="tel"
            placeholder="(555) 123-4567"
            class="w-full"
          />
          <small v-if="errors.phone" class="text-red-500">{{ errors.phone }}</small>
        </div>
      </form>
    </template>
  </Card>
</template>

<style scoped>
/* Add any custom styles here if needed */
</style>
