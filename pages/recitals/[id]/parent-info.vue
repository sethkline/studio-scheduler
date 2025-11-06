<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold">Parent Information Center</h1>
        <p v-if="recital" class="text-gray-600 mt-1">{{ recital.recital.name }}</p>
      </div>
      <div class="flex gap-3">
        <Button
          v-if="!editing"
          label="Edit"
          icon="pi pi-pencil"
          @click="startEditing"
        />
        <Button
          v-if="editing"
          label="Cancel"
          icon="pi pi-times"
          severity="secondary"
          @click="cancelEditing"
        />
        <Button
          v-if="editing"
          label="Save"
          icon="pi pi-check"
          @click="saveChanges"
          :loading="saving"
        />
        <Button
          label="Preview PDF"
          icon="pi pi-file-pdf"
          severity="secondary"
          outlined
        />
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <ProgressSpinner />
    </div>

    <div v-else-if="recital" class="space-y-6">
      <!-- Important Dates -->
      <Card>
        <template #title>Important Dates & Times</template>
        <template #content>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="show in recital.recital.recital_shows"
              :key="show.id"
              class="p-4 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <h4 class="font-semibold text-gray-900">Show</h4>
              <p class="text-gray-700">
                {{ formatDate(show.show_date) }} at {{ show.show_time }}
              </p>
              <p class="text-sm text-gray-600 mt-1">{{ show.venue }}</p>
            </div>
          </div>
        </template>
      </Card>

      <!-- Arrival Instructions -->
      <Card>
        <template #title>Arrival Instructions</template>
        <template #content>
          <Textarea
            v-if="editing"
            v-model="formData.arrivalInstructions"
            rows="4"
            class="w-full"
          />
          <p v-else class="text-gray-700 whitespace-pre-wrap">
            {{ recital.arrivalInstructions || 'No arrival instructions provided yet.' }}
          </p>
        </template>
      </Card>

      <!-- What to Bring -->
      <Card>
        <template #title>What to Bring</template>
        <template #content>
          <Textarea
            v-if="editing"
            v-model="formData.whatToBring"
            rows="4"
            class="w-full"
          />
          <p v-else class="text-gray-700 whitespace-pre-wrap">
            {{ recital.whatToBring || 'No information provided yet.' }}
          </p>
        </template>
      </Card>

      <!-- Parking & Directions -->
      <Card>
        <template #title>Parking & Directions</template>
        <template #content>
          <Textarea
            v-if="editing"
            v-model="formData.parkingInfo"
            rows="4"
            class="w-full"
          />
          <p v-else class="text-gray-700 whitespace-pre-wrap">
            {{ recital.parkingInfo || 'No parking information provided yet.' }}
          </p>
        </template>
      </Card>

      <!-- Backstage Rules -->
      <Card>
        <template #title>Backstage Rules</template>
        <template #content>
          <Textarea
            v-if="editing"
            v-model="formData.backstageRules"
            rows="4"
            class="w-full"
          />
          <p v-else class="text-gray-700 whitespace-pre-wrap">
            {{ recital.backstageRules || 'Standard backstage policies apply.' }}
          </p>
        </template>
      </Card>

      <!-- Photography Policy -->
      <Card>
        <template #title>Photography & Recording Policy</template>
        <template #content>
          <Textarea
            v-if="editing"
            v-model="formData.photographyPolicy"
            rows="4"
            class="w-full"
          />
          <p v-else class="text-gray-700 whitespace-pre-wrap">
            {{ recital.photographyPolicy || 'Standard photography policies apply.' }}
          </p>
        </template>
      </Card>

      <!-- FAQ -->
      <Card>
        <template #title>Frequently Asked Questions</template>
        <template #content>
          <div v-if="recital.faq && recital.faq.length > 0" class="space-y-4">
            <div
              v-for="(item, index) in recital.faq"
              :key="index"
              class="border-b border-gray-200 pb-4 last:border-0"
            >
              <h4 class="font-semibold text-gray-900 mb-2">{{ item.question }}</h4>
              <p class="text-gray-700">{{ item.answer }}</p>
            </div>
          </div>
          <p v-else class="text-gray-500">No FAQ items yet.</p>
        </template>
      </Card>

      <!-- Downloadable Resources -->
      <Card v-if="recital.resources && recital.resources.length > 0">
        <template #title>Downloadable Resources</template>
        <template #content>
          <div class="space-y-2">
            <a
              v-for="resource in recital.resources"
              :key="resource.id"
              :href="resource.file_path"
              target="_blank"
              class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <i class="pi pi-file text-blue-600 text-2xl"></i>
              <div class="flex-1">
                <p class="font-semibold text-gray-900">{{ resource.title }}</p>
                <p class="text-sm text-gray-600">{{ resource.description }}</p>
              </div>
              <i class="pi pi-download text-gray-400"></i>
            </a>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'staff']
})

const route = useRoute()
const toast = useToast()

const recitalId = route.params.id as string

const recital = ref<any>(null)
const loading = ref(false)
const editing = ref(false)
const saving = ref(false)

const formData = ref({
  arrivalInstructions: '',
  whatToBring: '',
  parkingInfo: '',
  photographyPolicy: '',
  backstageRules: '',
  dressCode: '',
  weatherCancellationPolicy: '',
  accessibilityInfo: ''
})

const loadParentInfo = async () => {
  loading.value = true

  try {
    const { data } = await useFetch(`/api/recitals/${recitalId}/parent-info`)
    if (data.value) {
      recital.value = data.value
      formData.value = {
        arrivalInstructions: data.value.arrivalInstructions || '',
        whatToBring: data.value.whatToBring || '',
        parkingInfo: data.value.parkingInfo || '',
        photographyPolicy: data.value.photographyPolicy || '',
        backstageRules: data.value.backstageRules || '',
        dressCode: data.value.dressCode || '',
        weatherCancellationPolicy: data.value.weatherCancellationPolicy || '',
        accessibilityInfo: data.value.accessibilityInfo || ''
      }
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load parent info', life: 3000 })
  } finally {
    loading.value = false
  }
}

const startEditing = () => {
  editing.value = true
}

const cancelEditing = () => {
  editing.value = false
  // Reset form data
  if (recital.value) {
    formData.value = {
      arrivalInstructions: recital.value.arrivalInstructions || '',
      whatToBring: recital.value.whatToBring || '',
      parkingInfo: recital.value.parkingInfo || '',
      photographyPolicy: recital.value.photographyPolicy || '',
      backstageRules: recital.value.backstageRules || '',
      dressCode: recital.value.dressCode || '',
      weatherCancellationPolicy: recital.value.weatherCancellationPolicy || '',
      accessibilityInfo: recital.value.accessibilityInfo || ''
    }
  }
}

const saveChanges = async () => {
  saving.value = true

  try {
    await $fetch(`/api/recitals/${recitalId}/parent-info`, {
      method: 'PUT',
      body: formData.value
    })

    toast.add({ severity: 'success', summary: 'Success', detail: 'Parent info updated', life: 3000 })
    editing.value = false
    await loadParentInfo()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save changes', life: 3000 })
  } finally {
    saving.value = false
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

onMounted(() => {
  loadParentInfo()
})
</script>
