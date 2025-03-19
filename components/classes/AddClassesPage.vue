<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Create New Class</h1>
      <Button label="Back to Classes" icon="pi pi-arrow-left" text @click="$router.back()" />
    </div>

    <div class="card">
      <form @submit.prevent="validateAndSubmit" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <!-- Name Field -->
            <div class="flex flex-col gap-1">
              <label for="name" class="block text-sm font-medium">Class Name*</label>
              <InputText 
                id="name"
                v-model="formData.name" 
                placeholder="Enter class name" 
                class="w-full" 
              />
              <Message v-if="errors.name" severity="error" size="small" variant="simple">
                {{ errors.name }}
              </Message>
            </div>

            <!-- Dance Style Field -->
            <div class="flex flex-col gap-1">
              <label for="dance_style_id" class="block text-sm font-medium">Dance Style*</label>
              <Dropdown
                id="dance_style_id"
                v-model="formData.dance_style_id"
                :options="danceStyles"
                optionLabel="name"
                optionValue="id"
                placeholder="Select a style"
                class="w-full"
              />
              <Message v-if="errors.dance_style_id" severity="error" size="small" variant="simple">
                {{ errors.dance_style_id }}
              </Message>
            </div>

            <!-- Class Level Field -->
            <div class="flex flex-col gap-1">
              <label for="class_level_id" class="block text-sm font-medium">Class Level</label>
              <Dropdown
                id="class_level_id"
                v-model="formData.class_level_id"
                :options="classLevels"
                optionLabel="name"
                optionValue="id"
                placeholder="Select a level"
                class="w-full"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <label for="min_age" class="block text-sm font-medium">Minimum Age</label>
                <InputNumber 
                  id="min_age"
                  v-model="formData.min_age"
                  min="0" 
                  class="w-full" 
                />
                <Message v-if="errors.min_age" severity="error" size="small" variant="simple">
                  {{ errors.min_age }}
                </Message>
              </div>

              <div class="flex flex-col gap-1">
                <label for="max_age" class="block text-sm font-medium">Maximum Age</label>
                <InputNumber 
                  id="max_age"
                  v-model="formData.max_age"
                  min="0" 
                  class="w-full" 
                />
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <!-- Duration Field -->
            <div class="flex flex-col gap-1">
              <label for="duration" class="block text-sm font-medium">Duration (minutes)*</label>
              <InputNumber 
                id="duration"
                v-model="formData.duration"
                min="5" 
                step="5" 
                suffix=" min" 
                class="w-full" 
              />
              <Message v-if="errors.duration" severity="error" size="small" variant="simple">
                {{ errors.duration }}
              </Message>
            </div>

            <!-- Maximum Students Field -->
            <div class="flex flex-col gap-1">
              <label for="max_students" class="block text-sm font-medium">Maximum Students</label>
              <InputNumber 
                id="max_students"
                v-model="formData.max_students"
                min="1" 
                class="w-full" 
              />
              <small class="text-gray-500">Leave blank for unlimited capacity</small>
            </div>

            <!-- Description Field -->
            <div class="flex flex-col gap-1">
              <label for="description" class="block text-sm font-medium">Description</label>
              <Textarea
                id="description"
                v-model="formData.description"
                rows="5"
                class="w-full"
                placeholder="Enter class description, goals, or other details"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <Button type="button" label="Cancel" icon="pi pi-times" outlined @click="$router.back()" />
          <Button type="submit" label="Save Class" icon="pi pi-check" :loading="saving" />
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod';

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'dashboard'
});

const router = useRouter();
const toast = useToast();

const danceStyles = ref([]);
const classLevels = ref([]);
const saving = ref(false);
const errors = ref({});

// Form data
const formData = ref({
  name: '',
  dance_style_id: null,
  class_level_id: null,
  min_age: null,
  max_age: null,
  description: '',
  duration: 60,
  max_students: null
});

// Define validation schema using Zod
const schema = z
  .object({
    name: z.string().min(1, { message: 'Class name is required' }),
    dance_style_id: z.string().min(1, { message: 'Dance style is required' }),
    class_level_id: z.string().nullable().optional(),
    min_age: z.number().nullable().optional(),
    max_age: z.number().nullable().optional(),
    description: z.string().nullable().optional(),
    duration: z.number().min(5, { message: 'Duration must be at least 5 minutes' }),
    max_students: z.number().nullable().optional()
  })
  .refine(
    (data) => {
      // Custom validation for age range
      if (data.min_age !== null && data.max_age !== null) {
        return data.min_age <= data.max_age;
      }
      return true;
    },
    {
      message: 'Minimum age cannot be greater than maximum age',
      path: ['min_age']
    }
  );

// API service
const { createClass, fetchDanceStyles, fetchClassLevels } = useApiService();

// Load references
const loadReferences = async () => {
  try {
    // Fetch dance styles
    const stylesResult = await fetchDanceStyles();
    if (stylesResult.error.value) {
      throw new Error(stylesResult.error.value.data?.statusMessage || 'Failed to load dance styles');
    }

    danceStyles.value = stylesResult.data.value || [];
    console.log('Dance styles loaded:', danceStyles.value);

    // Fetch class levels
    const levelsResult = await fetchClassLevels();
    if (levelsResult.error.value) {
      throw new Error(levelsResult.error.value.data?.statusMessage || 'Failed to load class levels');
    }

    classLevels.value = levelsResult.data.value || [];
    console.log('Class levels loaded:', classLevels.value);
  } catch (err) {
    console.error('Error loading references:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message,
      life: 3000
    });
  }
};

// Validate and submit
const validateAndSubmit = async () => {
  errors.value = {}; // Clear previous errors
  
  try {
    // Parse and validate form data with Zod
    const validatedData = schema.parse(formData.value);
    
    // If validation passes, submit the form
    await saveClass(validatedData);
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        const fieldName = err.path[0];
        errors.value[fieldName] = err.message;
      });
      
      toast.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please correct the errors in the form',
        life: 3000
      });
    } else {
      // Handle other errors
      console.error('Unexpected error:', error);
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'An unexpected error occurred',
        life: 3000
      });
    }
  }
};

// Save class
const saveClass = async (data) => {
  saving.value = true;

  try {
    console.log('Form data to be submitted:', data);

    const result = await createClass(data);

    if (result.error?.value) {
      throw new Error(result.error.value.data?.statusMessage || 'Failed to create class');
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Class created successfully',
      life: 3000
    });

    // Navigate back to class list
    router.push('/classes');
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message,
      life: 3000
    });
  } finally {
    saving.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  await loadReferences();
});
</script>