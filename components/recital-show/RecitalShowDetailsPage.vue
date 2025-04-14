<template>
  <div class="recital-show-details">
    <Breadcrumb :model="breadcrumbItems" :home="breadcrumbHome" class="mb-4">
      <template #item="{ item }">
        <router-link v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
          <a :href="href" class="p-menuitem-link" @click="navigate">
            <span class="p-menuitem-text">{{ item.label }}</span>
          </a>
        </router-link>
        <a v-else :href="item.url" class="p-menuitem-link">
          <span class="p-menuitem-text">{{ item.label }}</span>
        </a>
      </template>
    </Breadcrumb>

    <!-- Loading State -->
    <div v-if="loading" class="card flex justify-center items-center p-6">
      <ProgressSpinner class="w-12 h-12" />
      <p class="ml-4 text-gray-500">Loading recital show details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
      <div class="flex items-center">
        <i class="pi pi-exclamation-triangle text-red-500 text-2xl mr-3"></i>
        <div>
          <h3 class="font-bold">Error Loading Recital Show</h3>
          <p>{{ error }}</p>
          <Button label="Try Again" class="mt-3" @click="fetchRecitalShow" />
        </div>
      </div>
    </div>

    <!-- Show Details -->
    <div v-else-if="recitalShow" class="space-y-6">
      <!-- Header and Actions -->
      <div class="card">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 class="text-2xl font-bold text-primary-800">{{ recitalShow.name }}</h1>
            <p class="text-gray-600 mt-1">{{ formatDate(recitalShow.date) }} {{ formatTime(recitalShow.start_time) }}</p>
            <div class="mt-2">
              <Tag :value="recitalShow.status" 
                   :severity="getStatusSeverity(recitalShow.status)" 
                   class="mr-2" />
              <Tag v-if="recitalShow.can_sell_tickets" 
                   value="Tickets Available" 
                   severity="success" />
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button icon="pi pi-pencil" label="Edit Show" 
                    class="p-button-outlined" 
                    @click="navigateToEdit" />
            <Button icon="pi pi-file" label="Program" 
                    class="p-button-primary" 
                    @click="navigateToProgram" />
          </div>
        </div>
      </div>

      <!-- Details and Performances -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Show Details -->
        <div class="lg:col-span-1">
          <div class="card">
            <h2 class="text-xl font-semibold mb-4">Show Details</h2>
            <div class="space-y-3">
              <div>
                <div class="text-sm text-gray-500">Location</div>
                <div>{{ recitalShow.location || 'Not specified' }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-500">Series</div>
                <div>{{ recitalShow.series?.name || 'Not part of a series' }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-500">Description</div>
                <div>{{ recitalShow.description || 'No description provided' }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-500">Ticket Price</div>
                <div>{{ formatPrice(recitalShow.ticket_price_in_cents) }}</div>
              </div>
              <div v-if="recitalShow.can_sell_tickets">
                <div class="text-sm text-gray-500">Ticket Sales Period</div>
                <div>{{ formatDate(recitalShow.ticket_sale_start) }} - {{ formatDate(recitalShow.ticket_sale_end) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Performances Section -->
        <div class="lg:col-span-2">
          <div class="card">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold">Performances</h2>
              <Button icon="pi pi-plus" label="Add Performance" 
                      @click="openAddPerformanceDialog" />
            </div>

            <div v-if="performances.length === 0" class="p-4 text-center bg-gray-50 rounded-lg">
              <i class="pi pi-info-circle text-2xl text-gray-400 mb-2"></i>
              <p class="text-gray-500">No performances have been added to this show yet.</p>
              <p class="text-sm text-gray-400 mt-2">
                Click "Add Performance" to add classes to this recital.
              </p>
            </div>

            <DataTable v-else :value="performances" :rowHover="true" 
                      responsiveLayout="scroll" class="mt-2">
              <Column field="performance_order" header="#" style="width: 3rem">
                <template #body="{ data, index }">
                  <span class="font-bold">{{ data.performance_order || index + 1 }}</span>
                </template>
              </Column>
              <Column header="Class">
                <template #body="{ data }">
                  <div>
                    <div class="font-medium">{{ getClassDisplayName(data) }}</div>
                    <div v-if="data.class_instance?.class_definition?.dance_style" 
                          class="text-sm flex items-center">
                      <div class="w-3 h-3 rounded-full mr-2" 
                          :style="`background-color: ${data.class_instance?.class_definition?.dance_style?.color || '#cccccc'}`"></div>
                      <span>{{ data.class_instance?.class_definition?.dance_style?.name }}</span>
                    </div>
                  </div>
                </template>
              </Column>
              <Column header="Performance Details">
                <template #body="{ data }">
                  <div>
                    <div class="font-medium">{{ data.song_title || 'Untitled' }}</div>
                    <div class="text-sm text-gray-600 flex gap-3">
                      <span v-if="data.song_artist" class="flex items-center gap-1">
                        <i class="pi pi-volume-up text-xs"></i>
                        {{ data.song_artist }}
                      </span>
                      <span v-if="data.duration" class="flex items-center gap-1">
                        <i class="pi pi-clock text-xs"></i>
                        {{ formatDuration(data.duration) }}
                      </span>
                    </div>
                  </div>
                </template>
              </Column>
              <Column style="width: 8rem">
                <template #body="{ data }">
                  <div class="flex gap-1">
                    <Button icon="pi pi-pencil" class="p-button-sm p-button-outlined" 
                            @click="editPerformance(data)" />
                    <Button icon="pi pi-trash" class="p-button-sm p-button-outlined p-button-danger" 
                            @click="confirmDeletePerformance(data)" />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Performance Dialog -->
    <Dialog 
      v-model:visible="performanceDialog.visible" 
      :header="performanceDialog.title"
      :style="{width: '550px'}" 
      modal
      @hide="closePerformanceDialog"
    >
      <Form 
        v-if="performanceDialog.visible"
        v-slot="$form" 
        :initialValues="performanceDialog.data"
        :resolver="formResolver"
        @submit="savePerformance"
        class="space-y-4"
        :key="performanceDialog.data.id || 'new'"
      >
        <div class="field">
          <label for="class_instance_id" class="font-medium text-sm mb-1 block">Class Instance*</label>
          <Dropdown id="class_instance_id" 
                   name="class_instance_id"
                   :options="classInstances" 
                   optionLabel="display_name" 
                   optionValue="id"
                   placeholder="Select a class" 
                   class="w-full" 
                   aria-describedby="class_instance_id-error" />
          <Message 
            v-if="$form.class_instance_id?.invalid" 
            severity="error" 
            size="small" 
            variant="simple"
          >
            {{ $form.class_instance_id.error?.message }}
          </Message>
        </div>

        <div class="field">
          <label for="songTitle" class="font-medium text-sm mb-1 block">Song Title</label>
          <InputText id="songTitle" 
                    name="song_title"
                    class="w-full" 
                    aria-describedby="song_title-error" />
          <Message 
            v-if="$form.song_title?.invalid" 
            severity="error" 
            size="small" 
            variant="simple"
          >
            {{ $form.song_title.error?.message }}
          </Message>
        </div>

        <div class="field">
          <label for="songArtist" class="font-medium text-sm mb-1 block">Artist</label>
          <InputText id="songArtist" 
                    name="song_artist"
                    class="w-full" 
                    aria-describedby="song_artist-error" />
        </div>

        <div class="field">
          <label for="choreographer" class="font-medium text-sm mb-1 block">Choreographer</label>
          <InputText id="choreographer" 
                    name="choreographer"
                    class="w-full" />
        </div>

        <div class="field">
          <label for="duration" class="font-medium text-sm mb-1 block">Duration (seconds)</label>
          <InputNumber id="duration" 
                      name="duration"
                      class="w-full" 
                      :min="0" />
        </div>

        <div class="field">
          <label for="notes" class="font-medium text-sm mb-1 block">Performance Notes</label>
          <Textarea id="notes" 
                   name="notes"
                   rows="3" 
                   class="w-full" />
        </div>
        
        <div class="flex justify-end gap-2 pt-4">
          <Button 
            type="button" 
            label="Cancel" 
            icon="pi pi-times" 
            class="p-button-text" 
            @click="closePerformanceDialog"
            :disabled="performanceDialog.saving"
          />
          <Button 
            type="submit" 
            label="Save" 
            icon="pi pi-check"
            :loading="performanceDialog.saving"
          />
        </div>
      </Form>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup>
import { useConfirm } from 'primevue/useconfirm';
import { Form } from '@primevue/forms';
import { z } from 'zod';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import { useToast } from 'primevue/usetoast';

// Route parameters
const route = useRoute();
const router = useRouter();
const showId = route.params.id;

// Breadcrumb data
const breadcrumbHome = ref({ icon: 'pi pi-home', route: '/' });
const breadcrumbItems = computed(() => [
  { label: 'Recitals', route: '/recitals' },
  { label: 'Series Details', route: recitalShow.value?.series_id ? `/recitals/${recitalShow.value.series_id}` : null },
  { label: recitalShow.value?.name || 'Show Details' }
]);

// Services
const toast = useToast();
const confirm = useConfirm();
const { fetchClasses } = useApiService();

// State
const loading = ref(true);
const error = ref(null);
const recitalShow = ref(null);
const performances = ref([]);
const classInstances = ref([]);

// Performance Dialog
const performanceDialog = reactive({
  visible: false,
  title: 'Add Performance',
  isNew: true,
  saving: false,
  data: {
    id: null,
    class_instance_id: null,
    song_title: '',
    song_artist: '',
    choreographer: '',
    duration: 120,
    notes: ''
  }
});

// Zod validation schema
const performanceSchema = z.object({
  class_instance_id: z.string().min(1, "Class is required"),
  song_title: z.string().optional(),
  song_artist: z.string().optional(),
  choreographer: z.string().optional(),
  duration: z.number().min(0, "Duration cannot be negative").optional(),
  notes: z.string().optional()
});

// Create resolver
const formResolver = zodResolver(performanceSchema);

// Load data
onMounted(async () => {
  await fetchRecitalShow();
  await fetchClassInstances();
});

// Methods
async function fetchRecitalShow() {
  loading.value = true;
  error.value = null;
  
  try {
    const client = useSupabaseClient();
    
    // Fetch recital show details
    const { data: showData, error: showError } = await client
      .from('recital_shows')
      .select(`
        *,
        series:series_id (
          id,
          name,
          theme
        )
      `)
      .eq('id', showId)
      .single();
      
    if (showError) throw showError;
    recitalShow.value = showData;
    
    // Fetch performances for this show
    const { data: performanceData, error: performanceError } = await client
      .from('recital_performances')
      .select(`
        *,
        class_instance:class_instance_id (
          id,
          name,
          class_definition:class_definition_id (
            id,
            name,
            dance_style:dance_style_id (
              id,
              name,
              color
            )
          )
        )
      `)
      .eq('recital_id', showId)
      .order('performance_order');
      
    if (performanceError) throw performanceError;
    performances.value = performanceData;
    
  } catch (err) {
    console.error('Error fetching recital show details:', err);
    error.value = err.message || 'Failed to load show details';
  } finally {
    loading.value = false;
  }
}

async function fetchClassInstances() {
  try {
    const client = useSupabaseClient();
    
    const { data, error: fetchError } = await client
      .from('class_instances')
      .select(`
        id,
        name,
        class_definition:class_definition_id (
          id,
          name,
          dance_style:dance_style_id (
            id,
            name
          )
        )
      `)
      .eq('status', 'active');
      
    if (fetchError) throw fetchError;
    
    classInstances.value = data.map(instance => ({
      ...instance,
      display_name: `${instance.name || instance.class_definition?.name} (${instance.class_definition?.dance_style?.name || 'Unknown Style'})`
    }));
    
  } catch (err) {
    console.error('Error fetching class instances:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load classes',
      life: 3000
    });
  }
}

function getClassDisplayName(performance) {
  return performance.class_instance?.name || 
         performance.class_instance?.class_definition?.name || 
         'Unknown Class';
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function formatTime(timeString) {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes, 10));
  
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
  if (!seconds) return '?:??';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatPrice(priceInCents) {
  if (!priceInCents) return 'Free';
  return `$${(priceInCents / 100).toFixed(2)}`;
}

function getStatusSeverity(status) {
  const statusMap = {
    'planning': 'warning',
    'rehearsal': 'info',
    'active': 'success',
    'completed': 'success',
    'cancelled': 'danger'
  };
  return statusMap[status] || 'info';
}

function navigateToEdit() {
  router.push(`/recitals/shows/${showId}/edit`);
}

function navigateToProgram() {
  router.push(`/recitals/shows/${showId}/program`);
}

function openAddPerformanceDialog() {
  performanceDialog.title = 'Add Performance';
  performanceDialog.isNew = true;
  performanceDialog.data = {
    id: null,
    class_instance_id: null,
    song_title: '',
    song_artist: '',
    choreographer: '',
    duration: 120,
    notes: ''
  };
  performanceDialog.visible = true;
}

function editPerformance(performance) {
  performanceDialog.title = 'Edit Performance';
  performanceDialog.isNew = false;
  performanceDialog.data = {
    id: performance.id,
    class_instance_id: performance.class_instance_id,
    song_title: performance.song_title || '',
    song_artist: performance.song_artist || '',
    choreographer: performance.choreographer || '',
    duration: performance.duration || 120,
    notes: performance.notes || ''
  };
  performanceDialog.visible = true;
}

function closePerformanceDialog() {
  performanceDialog.visible = false;
}

async function savePerformance(event) {
  try {
    // Extract form values from submit event
    const { values, valid } = event;
    if (!valid) return;
    
    performanceDialog.saving = true;
    const client = useSupabaseClient();
    
    const performanceData = {
      class_instance_id: values.class_instance_id,
      song_title: values.song_title || '',
      song_artist: values.song_artist || '',
      choreographer: values.choreographer || '',
      duration: values.duration || 0,
      notes: values.notes || ''
    };
    
    if (performanceDialog.isNew) {
      // Create new performance
      const { data, error: insertError } = await client
        .from('recital_performances')
        .insert([
          {
            recital_id: showId,
            ...performanceData,
            performance_order: performances.value.length + 1
          }
        ])
        .select(`
          *,
          class_instance:class_instance_id (
            id,
            name,
            class_definition:class_definition_id (
              id,
              name,
              dance_style:dance_style_id (
                id,
                name,
                color
              )
            )
          )
        `);
      
      if (insertError) throw insertError;
      
      performances.value.push(data[0]);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Performance added successfully',
        life: 3000
      });
    } else {
      // Update existing performance
      const { data, error: updateError } = await client
        .from('recital_performances')
        .update(performanceData)
        .eq('id', performanceDialog.data.id)
        .select(`
          *,
          class_instance:class_instance_id (
            id,
            name,
            class_definition:class_definition_id (
              id,
              name,
              dance_style:dance_style_id (
                id,
                name,
                color
              )
            )
          )
        `);
      
      if (updateError) throw updateError;
      
      // Update the performance in the local array
      const index = performances.value.findIndex(p => p.id === performanceDialog.data.id);
      if (index !== -1) {
        performances.value[index] = data[0];
      }
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Performance updated successfully',
        life: 3000
      });
    }
    
    closePerformanceDialog();
  } catch (err) {
    console.error('Error saving performance:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to save performance',
      life: 3000
    });
  } finally {
    performanceDialog.saving = false;
  }
}

function confirmDeletePerformance(performance) {
  confirm.require({
    message: `Are you sure you want to remove "${getClassDisplayName(performance)}" from this recital?`,
    header: 'Delete Performance',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deletePerformance(performance)
  });
}

async function deletePerformance(performance) {
  try {
    // Use the API endpoint to delete the performance
    const { data, error } = await useFetch(`/api/recital-shows/${showId}/performances/${performance.id}`, {
      method: 'DELETE'
    });
    
    if (error.value) throw new Error(error.value.statusMessage || 'Failed to delete performance');
    
    // Remove from local array
    performances.value = performances.value.filter(p => p.id !== performance.id);
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Performance removed successfully',
      life: 3000
    });
  } catch (err) {
    console.error('Error deleting performance:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to delete performance',
      life: 3000
    });
  }
}

async function reorderPerformances() {
  if (performances.value.length === 0) return;
  
  try {
    const client = useSupabaseClient();
    
    // Prepare updates
    const updates = performances.value.map((perf, index) => ({
      id: perf.id,
      performance_order: index + 1
    }));
    
    // Update all performance orders
    const { error } = await client
      .from('recital_performances')
      .upsert(updates, { onConflict: 'id' });
    
    if (error) throw error;
    
    // Update local performance objects
    performances.value.forEach((perf, index) => {
      perf.performance_order = index + 1;
    });
  } catch (err) {
    console.error('Error reordering performances:', err);
  }
}
</script>