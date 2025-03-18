<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Studio Locations</h1>
      <Button label="Add Location" icon="pi pi-plus" @click="openNewLocationDialog" />
    </div>
    
    <div v-if="loading" class="flex justify-center my-8">
      <i class="pi pi-spin pi-spinner text-2xl"></i>
    </div>
    
    <div v-else-if="locations.length === 0" class="card text-center py-12">
      <i class="pi pi-home text-5xl text-gray-300 mb-3"></i>
      <h3 class="text-xl font-semibold text-gray-500">No Locations Found</h3>
      <p class="text-gray-400 mt-2 mb-6">You haven't added any studio locations yet.</p>
      <Button label="Add Your First Location" icon="pi pi-plus" @click="openNewLocationDialog" />
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="location in locations" :key="location.id" class="card">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-xl font-bold">{{ location.name }}</h3>
            <Badge v-if="location.is_active" value="Active" severity="success" class="mt-1" />
            <Badge v-else value="Inactive" severity="warning" class="mt-1" />
          </div>
          <Menu :model="getLocationMenuItems(location)" :popup="true">
            <template #trigger="{ toggle, id }">
              <Button icon="pi pi-ellipsis-v" class="p-button-text p-button-sm" @click="toggle($event, id)" />
            </template>
          </Menu>
        </div>
        
        <p v-if="location.description" class="text-gray-600 mt-3">{{ location.description }}</p>
        
        <div class="mt-4">
          <div class="flex items-start mt-2">
            <i class="pi pi-map-marker mt-1 mr-2 text-gray-500"></i>
            <div>
              <div>{{ location.address }}</div>
              <div>{{ location.city }}, {{ location.state }} {{ location.postal_code }}</div>
            </div>
          </div>
          
          <div v-if="location.phone" class="flex items-center mt-2">
            <i class="pi pi-phone mr-2 text-gray-500"></i>
            <div>{{ location.phone }}</div>
          </div>
          
          <div v-if="location.email" class="flex items-center mt-2">
            <i class="pi pi-envelope mr-2 text-gray-500"></i>
            <div>{{ location.email }}</div>
          </div>
        </div>
        
        <div class="flex justify-between mt-6">
          <Button 
            label="Manage Rooms" 
            icon="pi pi-th-large" 
            class="p-button-outlined p-button-sm"
            @click="navigateToRooms(location.id)"
          />
          <Button
            label="Set Hours"
            icon="pi pi-clock"
            class="p-button-outlined p-button-sm"
            @click="openHoursDialog(location)"
          />
        </div>
      </div>
    </div>
    
    <!-- New/Edit Location Dialog -->
    <Dialog 
      v-model:visible="locationDialog.visible" 
      :header="locationDialog.isNew ? 'Add Location' : 'Edit Location'"
      :modal="true"
      :closable="true"
      :style="{ width: '90%', maxWidth: '600px' }"
      class="location-dialog"
    >
      <form @submit.prevent="saveLocation" class="space-y-4">
        <div>
          <label for="locationName" class="label">Location Name*</label>
          <InputText 
            id="locationName" 
            v-model="locationDialog.form.name" 
            class="w-full"
            :class="{ 'p-invalid': locationDialog.errors.name }"
            required
          />
          <small v-if="locationDialog.errors.name" class="p-error">{{ locationDialog.errors.name }}</small>
        </div>
        
        <div>
          <label for="locationDescription" class="label">Description</label>
          <Textarea
            id="locationDescription"
            v-model="locationDialog.form.description"
            rows="3"
            class="w-full"
          />
        </div>
        
        <div>
          <label for="locationAddress" class="label">Address*</label>
          <InputText 
            id="locationAddress" 
            v-model="locationDialog.form.address" 
            class="w-full"
            :class="{ 'p-invalid': locationDialog.errors.address }"
            required
          />
          <small v-if="locationDialog.errors.address" class="p-error">{{ locationDialog.errors.address }}</small>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="locationCity" class="label">City*</label>
            <InputText 
              id="locationCity" 
              v-model="locationDialog.form.city" 
              class="w-full"
              :class="{ 'p-invalid': locationDialog.errors.city }"
              required
            />
            <small v-if="locationDialog.errors.city" class="p-error">{{ locationDialog.errors.city }}</small>
          </div>
          
          <div>
            <label for="locationState" class="label">State*</label>
            <InputText 
              id="locationState" 
              v-model="locationDialog.form.state" 
              class="w-full"
              :class="{ 'p-invalid': locationDialog.errors.state }"
              required
            />
            <small v-if="locationDialog.errors.state" class="p-error">{{ locationDialog.errors.state }}</small>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="locationPostalCode" class="label">Postal Code*</label>
            <InputText 
              id="locationPostalCode" 
              v-model="locationDialog.form.postal_code" 
              class="w-full"
              :class="{ 'p-invalid': locationDialog.errors.postal_code }"
              required
            />
            <small v-if="locationDialog.errors.postal_code" class="p-error">{{ locationDialog.errors.postal_code }}</small>
          </div>
          
          <div>
            <label for="locationCountry" class="label">Country</label>
            <InputText 
              id="locationCountry" 
              v-model="locationDialog.form.country" 
              class="w-full"
            />
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="locationPhone" class="label">Phone</label>
            <InputText 
              id="locationPhone" 
              v-model="locationDialog.form.phone" 
              class="w-full"
            />
          </div>
          
          <div>
            <label for="locationEmail" class="label">Email</label>
            <InputText 
              id="locationEmail" 
              v-model="locationDialog.form.email" 
              class="w-full"
            />
          </div>
        </div>
        
        <div>
          <label for="locationCapacity" class="label">Capacity (students)</label>
          <InputNumber 
            id="locationCapacity" 
            v-model="locationDialog.form.capacity" 
            class="w-full"
            min="0"
          />
        </div>
        
        <div class="flex items-center">
          <Checkbox v-model="locationDialog.form.is_active" :binary="true" inputId="locationActive" />
          <label for="locationActive" class="ml-2">Active</label>
        </div>
        
        <div class="flex justify-end space-x-3 pt-4">
          <Button 
            label="Cancel" 
            type="button" 
            class="p-button-text" 
            @click="locationDialog.visible = false"
            :disabled="locationDialog.saving"
          />
          <Button 
            label="Save" 
            type="submit" 
            :loading="locationDialog.saving"
          />
        </div>
      </form>
    </Dialog>
    
    <!-- Operating Hours Dialog -->
    <Dialog
      v-model:visible="hoursDialog.visible"
      header="Set Operating Hours"
      :modal="true"
      :closable="true"
      :style="{ width: '90%', maxWidth: '700px' }"
    >
      <div v-if="hoursDialog.loading" class="flex justify-center my-4">
        <i class="pi pi-spin pi-spinner text-2xl"></i>
      </div>
      
      <div v-else>
        <h3 class="text-lg font-semibold mb-3">{{ hoursDialog.locationName }}</h3>
        
        <div class="mb-6">
          <h4 class="font-semibold mb-2">Regular Hours</h4>
          <div class="space-y-3">
            <div v-for="(day, index) in hoursDialog.weekDays" :key="index" class="grid grid-cols-12 gap-2 items-center">
              <div class="col-span-3">{{ day }}</div>
              
              <div class="col-span-8 flex items-center">
                <div v-if="hoursDialog.form.regularHours[index].isClosed" class="text-gray-500 italic">
                  Closed
                </div>
                <div v-else class="grid grid-cols-2 gap-2 w-full">
                  <div>
                    <DatePicker 
                      v-model="hoursDialog.form.regularHours[index].openTime" 
                      timeOnly 
                      hourFormat="12"
                      class="w-full"
                    />
                  </div>
                  <div>
                    <DatePicker 
                      v-model="hoursDialog.form.regularHours[index].closeTime" 
                      timeOnly 
                      hourFormat="12"
                      class="w-full"
                    />
                  </div>
                </div>
              </div>
              
              <div class="col-span-1 flex justify-end">
                <Checkbox 
                  v-model="hoursDialog.form.regularHours[index].isClosed" 
                  :binary="true" 
                  :inputId="`day-closed-${index}`"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <h4 class="font-semibold">Special Hours & Closures</h4>
            <Button 
              icon="pi pi-plus" 
              label="Add" 
              class="p-button-sm" 
              @click="openSpecialHoursForm"
            />
          </div>
          
          <div v-if="hoursDialog.form.specialHours.length === 0" class="text-gray-500 italic p-3 text-center">
            No special hours or closures scheduled.
          </div>
          
          <div v-else class="border rounded divide-y">
            <div v-for="(special, index) in hoursDialog.form.specialHours" :key="index" class="p-3 flex justify-between items-center">
              <div>
                <div class="font-semibold">{{ formatDate(special.date) }}</div>
                <div v-if="special.isClosed" class="text-red-500">Closed</div>
                <div v-else>{{ formatTime(special.openTime) }} - {{ formatTime(special.closeTime) }}</div>
                <div v-if="special.description" class="text-sm text-gray-600">{{ special.description }}</div>
              </div>
              <Button icon="pi pi-trash" class="p-button-text p-button-danger p-button-sm" @click="removeSpecialHours(index)" />
            </div>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3 pt-4">
          <Button 
            label="Cancel" 
            type="button" 
            class="p-button-text" 
            @click="hoursDialog.visible = false"
            :disabled="hoursDialog.saving"
          />
          <Button 
            label="Save Hours" 
            @click="saveHours"
            :loading="hoursDialog.saving"
          />
        </div>
      </div>
    </Dialog>
    
    <!-- Special Hours Form Dialog -->
    <Dialog
      v-model:visible="specialHoursForm.visible"
      header="Add Special Hours"
      :modal="true"
      :closable="true"
      :style="{ width: '90%', maxWidth: '500px' }"
    >
      <form @submit.prevent="addSpecialHours" class="space-y-4">
        <div>
          <label for="specialDate" class="label">Date*</label>
          <Calendar 
            id="specialDate" 
            v-model="specialHoursForm.date" 
            dateFormat="mm/dd/yy"
            class="w-full"
            :class="{ 'p-invalid': specialHoursForm.errors.date }"
            required
          />
          <small v-if="specialHoursForm.errors.date" class="p-error">{{ specialHoursForm.errors.date }}</small>
        </div>
        
        <div class="flex items-center mb-4">
          <Checkbox v-model="specialHoursForm.isClosed" :binary="true" inputId="specialClosed" />
          <label for="specialClosed" class="ml-2">Closed on this day</label>
        </div>
        
        <div v-if="!specialHoursForm.isClosed" class="grid grid-cols-2 gap-4">
          <div>
            <label for="specialOpen" class="label">Opening Time*</label>
            <Calendar 
              id="specialOpen" 
              v-model="specialHoursForm.openTime" 
              timeOnly 
              hourFormat="12"
              class="w-full"
              :class="{ 'p-invalid': specialHoursForm.errors.openTime }"
              required
            />
            <small v-if="specialHoursForm.errors.openTime" class="p-error">{{ specialHoursForm.errors.openTime }}</small>
          </div>
          
          <div>
            <label for="specialClose" class="label">Closing Time*</label>
            <Calendar 
              id="specialClose" 
              v-model="specialHoursForm.closeTime" 
              timeOnly 
              hourFormat="12"
              class="w-full"
              :class="{ 'p-invalid': specialHoursForm.errors.closeTime }"
              required
            />
            <small v-if="specialHoursForm.errors.closeTime" class="p-error">{{ specialHoursForm.errors.closeTime }}</small>
          </div>
        </div>
        
        <div>
          <label for="specialDescription" class="label">Description</label>
          <InputText 
            id="specialDescription" 
            v-model="specialHoursForm.description" 
            class="w-full"
            placeholder="e.g., Holiday, Special Event"
          />
        </div>
        
        <div class="flex justify-end space-x-3 pt-4">
          <Button 
            label="Cancel" 
            type="button" 
            class="p-button-text" 
            @click="specialHoursForm.visible = false"
          />
          <Button 
            label="Add" 
            type="submit"
          />
        </div>
      </form>
    </Dialog>
    
    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useStudioStore } from '~/stores/studio'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useRouter } from 'vue-router'
// import { formatTime, formatDate, formatTimeForAPI} from '~/utils/time'

// Component setup
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

// Store and services
const studioStore = useStudioStore()
const toast = useToast()
const confirm = useConfirm()
const router = useRouter()

// State
const loading = ref(true)
const locations = ref([])

// Location dialog state
const locationDialog = reactive({
  visible: false,
  isNew: true,
  saving: false,
  form: {
    id: null,
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    phone: '',
    email: '',
    capacity: null,
    is_active: true
  },
  errors: {}
})

// Hours dialog state
const hoursDialog = reactive({
  visible: false,
  loading: false,
  saving: false,
  locationId: null,
  locationName: '',
  weekDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  form: {
    regularHours: [],
    specialHours: []
  }
})

// Special hours form
const specialHoursForm = reactive({
  visible: false,
  date: null,
  openTime: null,
  closeTime: null,
  isClosed: false,
  description: '',
  errors: {}
})

const formatTimeForAPI = (date) => {
  // Check if date is actually a Date object
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error('Invalid date provided to formatTimeForAPI:', date);
    return "00:00:00"; // Default fallback
  }
  
  // Format the time as HH:MM:SS
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`;
};
// Date formatting utility
 const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString();
};

// Time formatting utility
 const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Load data
onMounted(async () => {
  try {
    loading.value = true
    const result = await studioStore.fetchLocations()
    locations.value = result.locations
  } catch (error) {
    console.error('Error loading locations:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load studio locations.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
})

// Actions
const openNewLocationDialog = () => {
  locationDialog.isNew = true
  locationDialog.form = {
    id: null,
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    phone: '',
    email: '',
    capacity: null,
    is_active: true
  }
  locationDialog.errors = {}
  locationDialog.visible = true
}

const openEditLocationDialog = (location) => {
  locationDialog.isNew = false
  locationDialog.form = { ...location }
  locationDialog.errors = {}
  locationDialog.visible = true
}

const validateLocationForm = () => {
  const errors = {}
  
  if (!locationDialog.form.name.trim()) {
    errors.name = 'Location name is required'
  }
  
  if (!locationDialog.form.address.trim()) {
    errors.address = 'Address is required'
  }
  
  if (!locationDialog.form.city.trim()) {
    errors.city = 'City is required'
  }
  
  if (!locationDialog.form.state.trim()) {
    errors.state = 'State is required'
  }
  
  if (!locationDialog.form.postal_code.trim()) {
    errors.postal_code = 'Postal code is required'
  }
  
  locationDialog.errors = errors
  return Object.keys(errors).length === 0
}

const saveLocation = async () => {
  if (!validateLocationForm()) return
  
  try {
    locationDialog.saving = true
    
    if (locationDialog.isNew) {
      // Create new location
      const result = await studioStore.createLocation(locationDialog.form)
      
      if (result) {
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Location has been created successfully.',
          life: 3000
        })
        
        // Refresh locations list
        const refreshedData = await studioStore.fetchLocations()
        locations.value = refreshedData.locations
        
        locationDialog.visible = false
      } else {
        throw new Error('Failed to create location')
      }
    } else {
      // Update existing location
      const result = await studioStore.updateLocation(locationDialog.form.id, locationDialog.form)
      
      if (result) {
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Location has been updated successfully.',
          life: 3000
        })
        
        // Update in the locations list
        const index = locations.value.findIndex(loc => loc.id === locationDialog.form.id)
        if (index !== -1) {
          locations.value[index] = { ...locations.value[index], ...result }
        }
        
        locationDialog.visible = false
      } else {
        throw new Error('Failed to update location')
      }
    }
  } catch (error) {
    console.error('Error saving location:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save location.',
      life: 3000
    })
  } finally {
    locationDialog.saving = false
  }
}

const confirmDeleteLocation = (location) => {
  confirm.require({
    message: `Are you sure you want to delete the location "${location.name}"?`,
    header: 'Delete Location',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteLocation(location.id),
    reject: () => {}
  })
}

const deleteLocation = async (id) => {
  try {
    loading.value = true
    
    const result = await studioStore.deleteLocation(id)
    
    if (result) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Location has been deleted successfully.',
        life: 3000
      })
      
      // Remove from local list
      locations.value = locations.value.filter(loc => loc.id !== id)
    } else {
      throw new Error('Failed to delete location')
    }
  } catch (error) {
    console.error('Error deleting location:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to delete location. It may be in use.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const openHoursDialog = async (location) => {
  hoursDialog.locationId = location.id
  hoursDialog.locationName = location.name
  hoursDialog.loading = true
  hoursDialog.visible = true
  
  try {
    // Initialize regular hours array with default values
    hoursDialog.form.regularHours = Array(7).fill(null).map(() => ({
      openTime: new Date(2000, 0, 1, 9, 0), // 9:00 AM
      closeTime: new Date(2000, 0, 1, 21, 0), // 9:00 PM
      isClosed: false
    }))
    
    // Initialize special hours array
    hoursDialog.form.specialHours = []
    
    // Fetch location details with hours
    const locationDetails = await studioStore.fetchLocationDetails(location.id)
    
    if (locationDetails) {
      // Map operating hours to form structure
      if (locationDetails.operatingHours && locationDetails.operatingHours.length > 0) {
        locationDetails.operatingHours.forEach(hour => {
          const dayIndex = hour.day_of_week
          
          if (dayIndex >= 0 && dayIndex <= 6) {
            // Convert time strings to Date objects for the time picker
            const [openHours, openMinutes] = hour.open_time.split(':').map(Number)
            const [closeHours, closeMinutes] = hour.close_time.split(':').map(Number)
            
            hoursDialog.form.regularHours[dayIndex] = {
              openTime: new Date(2000, 0, 1, openHours, openMinutes),
              closeTime: new Date(2000, 0, 1, closeHours, closeMinutes),
              isClosed: hour.is_closed
            }
          }
        })
      }
      
      // Map special hours if any
      if (locationDetails.specialHours && locationDetails.specialHours.length > 0) {
        hoursDialog.form.specialHours = locationDetails.specialHours.map(special => {
          let openTime = null
          let closeTime = null
          
          if (!special.is_closed && special.open_time && special.close_time) {
            const [openHours, openMinutes] = special.open_time.split(':').map(Number)
            const [closeHours, closeMinutes] = special.close_time.split(':').map(Number)
            
            openTime = new Date(2000, 0, 1, openHours, openMinutes)
            closeTime = new Date(2000, 0, 1, closeHours, closeMinutes)
          }
          
          return {
            id: special.id,
            date: new Date(special.date),
            openTime,
            closeTime,
            isClosed: special.is_closed,
            description: special.description || ''
          }
        })
      }
    }
  } catch (error) {
    console.error('Error loading hours:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load operating hours.',
      life: 3000
    })
  } finally {
    hoursDialog.loading = false
  }
}

const saveHours = async () => {
  try {
    hoursDialog.saving = true

    console.log('Before transformation:', JSON.stringify(hoursDialog.form.regularHours));
    
    // First save regular hours
    const regularHoursData = hoursDialog.form.regularHours.map((hour, index) => {
      if (hour.isClosed) {
        return {
          dayOfWeek: index,
          isClosed: true
        }
      }

      const openTimeFormatted = formatTimeForAPI(hour.openTime);
      const closeTimeFormatted = formatTimeForAPI(hour.closeTime);
      
      console.log(`Day ${index} times:`, openTimeFormatted, closeTimeFormatted);
      
      return {
        dayOfWeek: index,
        openTime: openTimeFormatted,
        closeTime: closeTimeFormatted,
        isClosed: false
      }
    })

    console.log('Transformed data:', JSON.stringify(regularHoursData));
    
    await studioStore.updateOperatingHours(hoursDialog.locationId, regularHoursData)
    
    // Then handle special hours - this would require multiple API calls
    // This is simplified for the example
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Operating hours have been saved successfully.',
      life: 3000
    })
    
    hoursDialog.visible = false
  } catch (error) {
    console.error('Error saving hours:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save operating hours.',
      life: 3000
    })
  } finally {
    hoursDialog.saving = false
  }
}

const openSpecialHoursForm = () => {
  specialHoursForm.date = new Date()
  specialHoursForm.openTime = new Date(2000, 0, 1, 9, 0)
  specialHoursForm.closeTime = new Date(2000, 0, 1, 21, 0)
  specialHoursForm.isClosed = false
  specialHoursForm.description = ''
  specialHoursForm.errors = {}
  specialHoursForm.visible = true
}

const validateSpecialHoursForm = () => {
  const errors = {}
  
  if (!specialHoursForm.date) {
    errors.date = 'Date is required'
  }
  
  if (!specialHoursForm.isClosed) {
    if (!specialHoursForm.openTime) {
      errors.openTime = 'Opening time is required'
    }
    
    if (!specialHoursForm.closeTime) {
      errors.closeTime = 'Closing time is required'
    }
    
    if (specialHoursForm.openTime && specialHoursForm.closeTime && 
        specialHoursForm.openTime >= specialHoursForm.closeTime) {
      errors.closeTime = 'Closing time must be after opening time'
    }
  }
  
  specialHoursForm.errors = errors
  return Object.keys(errors).length === 0
}

const addSpecialHours = () => {
  if (!validateSpecialHoursForm()) return
  
  // Add to the hours dialog form
  hoursDialog.form.specialHours.push({
    date: specialHoursForm.date,
    openTime: specialHoursForm.isClosed ? null : specialHoursForm.openTime,
    closeTime: specialHoursForm.isClosed ? null : specialHoursForm.closeTime,
    isClosed: specialHoursForm.isClosed,
    description: specialHoursForm.description
  })
  
  // Sort by date
  hoursDialog.form.specialHours.sort((a, b) => a.date - b.date)
  
  specialHoursForm.visible = false
}

const removeSpecialHours = (index) => {
  hoursDialog.form.specialHours.splice(index, 1)
}

const navigateToRooms = (locationId) => {
  router.push(`/studio/locations/${locationId}/rooms`)
}

const getLocationMenuItems = (location) => {
  return [
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: () => openEditLocationDialog(location)
    },
    {
      label: location.is_active ? 'Deactivate' : 'Activate',
      icon: location.is_active ? 'pi pi-times' : 'pi pi-check',
      command: () => toggleLocationStatus(location)
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: () => confirmDeleteLocation(location)
    }
  ]
}

const toggleLocationStatus = async (location) => {
  try {
    loading.value = true
    
    const result = await studioStore.updateLocation(location.id, {
      is_active: !location.is_active
    })
    
    if (result) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: `Location has been ${result.is_active ? 'activated' : 'deactivated'}.`,
        life: 3000
      })
      
      // Update in the locations list
      const index = locations.value.findIndex(loc => loc.id === location.id)
      if (index !== -1) {
        locations.value[index] = { ...locations.value[index], is_active: !location.is_active }
      }
    } else {
      throw new Error('Failed to update location status')
    }
  } catch (error) {
    console.error('Error updating location status:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update location status.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

</script>