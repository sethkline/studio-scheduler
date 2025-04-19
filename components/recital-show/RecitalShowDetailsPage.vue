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
            <p class="text-gray-600 mt-1">
              {{ formatDate(recitalShow.date) }} {{ formatTime(recitalShow.start_time) }}
            </p>
            <div class="mt-2">
              <Tag :value="recitalShow.status" :severity="getStatusSeverity(recitalShow.status)" class="mr-2" />
              <Tag v-if="recitalShow.can_sell_tickets" value="Tickets Available" severity="success" />
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button icon="pi pi-pencil" label="Edit Show" class="p-button-outlined" @click="navigateToEdit" />
            <Button icon="pi pi-file" label="Program" class="p-button-primary" @click="navigateToProgram" />
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
                <div>
                  {{ formatDate(recitalShow.ticket_sale_start) }} - {{ formatDate(recitalShow.ticket_sale_end) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Performances Section -->
        <div class="lg:col-span-2">
          <div class="card">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold">Performances</h2>
              <div class="flex gap-2">
                <!-- New Import Performance Button -->
                <RecitalShowPerformanceImportDialog :recital-id="showId" @import-complete="onPerformancesImported" />
                <Button icon="pi pi-plus" label="Add Performance" @click="openAddPerformanceDialog" />
              </div>
            </div>

            <div v-if="performances.length === 0" class="p-4 text-center bg-gray-50 rounded-lg">
              <i class="pi pi-info-circle text-2xl text-gray-400 mb-2"></i>
              <p class="text-gray-500">No performances have been added to this show yet.</p>
              <p class="text-sm text-gray-400 mt-2">
                Click "Add Performance" to add classes to this recital, or use "Import Performances" to bulk import.
              </p>
            </div>

            <DataTable v-else :value="performances" :rowHover="true" responsiveLayout="scroll" class="mt-2">
              <Column field="performance_order" header="#" style="width: 3rem">
                <template #body="{ data, index }">
                  <span class="font-bold">{{ data.performance_order || index + 1 }}</span>
                </template>
              </Column>
              <Column header="Class">
                <template #body="{ data }">
                  <div>
                    <div class="font-medium">{{ getClassDisplayName(data) }}</div>
                    <div v-if="data.class_instance?.class_definition?.dance_style" class="text-sm flex items-center">
                      <div
                        class="w-3 h-3 rounded-full mr-2"
                        :style="`background-color: ${
                          data.class_instance?.class_definition?.dance_style?.color || '#cccccc'
                        }`"
                      ></div>
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
                      <span v-if="data.choreographer" class="flex items-center gap-1">
                        <i class="pi pi-user text-xs"></i>
                        {{ data.choreographer }}
                      </span>
                    </div>
                  </div>
                </template>
              </Column>
              <Column header="Dancers">
                <template #body="{ data }">
                  <div v-if="!dancersLoaded[data.id]" class="text-sm text-gray-500">
                    <i class="pi pi-spin pi-spinner mr-1"></i> Loading dancers...
                  </div>
                  <div
                    v-else-if="performanceDancers[data.id] && performanceDancers[data.id].length > 0"
                    class="text-sm"
                  >
                    <div class="line-clamp-2">
                      {{ formatDancersArray(performanceDancers[data.id]) }}
                    </div>
                    <Button
                      v-if="performanceDancers[data.id].length > 3"
                      label="View All"
                      class="p-button-text p-button-sm p-0 text-xs text-primary-600"
                      @click="viewDancers(data, performanceDancers[data.id])"
                    />
                  </div>
                  <div v-else-if="data.notes && data.notes.includes('Dancers:')" class="text-sm">
                    <!-- Fallback to notes field if no dancers in table -->
                    <div class="line-clamp-2">
                      {{ data.notes.substring(data.notes.indexOf('Dancers:') + 8).trim() }}
                    </div>
                    <Button
                      v-if="data.notes.length > 100"
                      label="View All"
                      class="p-button-text p-button-sm p-0 text-xs text-primary-600"
                      @click="viewDancersFromNotes(data)"
                    />
                  </div>
                  <div v-else class="text-sm text-gray-500">No dancers listed</div>
                </template>
              </Column>
              <Column style="width: 8rem">
                <template #body="{ data }">
                  <div class="flex gap-1">
                    <Button icon="pi pi-pencil" class="p-button-sm p-button-outlined" @click="editPerformance(data)" />
                    <Button
                      icon="pi pi-trash"
                      class="p-button-sm p-button-outlined p-button-danger"
                      @click="confirmDeletePerformance(data)"
                    />
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
      :style="{ width: '550px' }"
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
          <Dropdown
            id="class_instance_id"
            name="class_instance_id"
            :options="classInstances"
            optionLabel="display_name"
            optionValue="id"
            placeholder="Select a class"
            class="w-full"
            filter
            aria-describedby="class_instance_id-error"
          />
          <Message v-if="$form.class_instance_id?.invalid" severity="error" size="small" variant="simple">
            {{ $form.class_instance_id.error?.message }}
          </Message>
        </div>

        <div class="field">
          <label for="performance_order" class="font-medium text-sm mb-1 block">Performance Order*</label>
          <InputNumber
            id="performance_order"
            name="performance_order"
            class="w-full"
            :min="1"
            aria-describedby="performance_order-error"
          />
          <Message v-if="$form.performance_order?.invalid" severity="error" size="small" variant="simple">
            {{ $form.performance_order.error?.message }}
          </Message>
        </div>

        <div class="field">
          <label for="songTitle" class="font-medium text-sm mb-1 block">Song Title</label>
          <InputText id="songTitle" name="song_title" class="w-full" aria-describedby="song_title-error" />
          <Message v-if="$form.song_title?.invalid" severity="error" size="small" variant="simple">
            {{ $form.song_title.error?.message }}
          </Message>
        </div>

        <div class="field">
          <label for="songArtist" class="font-medium text-sm mb-1 block">Artist</label>
          <InputText id="songArtist" name="song_artist" class="w-full" aria-describedby="song_artist-error" />
        </div>

        <div class="field">
          <label for="choreographer" class="font-medium text-sm mb-1 block">Choreographer</label>
          <InputText id="choreographer" name="choreographer" class="w-full" />
        </div>

        <div class="field">
          <label for="duration" class="font-medium text-sm mb-1 block">Duration (seconds)</label>
          <InputNumber id="duration" name="duration" class="w-full" :min="0" />
        </div>

        <div class="field">
          <label for="notes" class="font-medium text-sm mb-1 block">Dancers/Performance Notes</label>
          <Textarea
            id="notes"
            name="notes"
            rows="5"
            class="w-full"
            placeholder="Enter dancer names or other performance notes. For dancer lists, start with 'Dancers:'"
          />
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
          <Button type="submit" label="Save" icon="pi pi-check" :loading="performanceDialog.saving" />
        </div>
      </Form>
    </Dialog>

    <!-- Dancers View Dialog -->
    <Dialog v-model:visible="dancersDialog.visible" :header="dancersDialog.title" :style="{ width: '500px' }" modal>
      <div class="p-2">
        <h4 class="font-medium mb-2">{{ dancersDialog.songTitle }}</h4>
        <div class="text-sm mb-4">
          <span class="font-medium">Choreographer:</span> {{ dancersDialog.choreographer || 'Not specified' }}
        </div>
        <div class="dancers-list">
          <div class="font-medium mb-1">Dancers:</div>
          <div class="text-sm whitespace-pre-wrap">{{ formatDancersList(dancersDialog.dancers) }}</div>
        </div>
      </div>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm';
import { Form } from '@primevue/forms';
import { z } from 'zod';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import { useToast } from 'primevue/usetoast';
// import PerformanceImportDialog from './PerformanceImportDialog.vue';

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
const performanceDancers = ref({});
const dancersLoaded = ref({});

// Performance Dialog
const performanceDialog = reactive({
  visible: false,
  title: 'Add Performance',
  isNew: true,
  saving: false,
  data: {
    id: null,
    class_instance_id: null,
    performance_order: null,
    song_title: '',
    song_artist: '',
    choreographer: '',
    duration: 120,
    notes: ''
  }
});

// Dancers Dialog
const dancersDialog = reactive({
  visible: false,
  title: 'Dancers',
  songTitle: '',
  choreographer: '',
  dancers: ''
});

// Zod validation schema
const performanceSchema = z.object({
  class_instance_id: z.string().min(1, 'Class is required'),
  performance_order: z.number().min(1, 'Order number is required'),
  song_title: z.string().optional(),
  song_artist: z.string().optional(),
  choreographer: z.string().optional(),
  duration: z.number().min(0, 'Duration cannot be negative').optional(),
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

async function fetchDancersForPerformances(performancesList) {
  try {
    const client = useSupabaseClient();

    // For each performance, fetch its dancers
    for (const performance of performancesList) {
      const { data: dancerData, error: dancerError } = await client
        .from('performance_dancers')
        .select('id, dancer_name')
        .eq('performance_id', performance.id);

      if (dancerError) {
        console.error(`Error fetching dancers for performance ${performance.id}:`, dancerError);
        continue;
      }

      // Add dancers to the performance object
      performance.dancers = dancerData || [];
    }
  } catch (err) {
    console.error('Error fetching dancers:', err);
  }
}
async function fetchRecitalShow() {
  loading.value = true;
  error.value = null;
  
  try {
    const client = useSupabaseClient();
    
    // Fetch recital show details (your existing code)
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
    
    // Fetch performances for this show (your existing code)
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
    
    // Store the performances
    performances.value = performanceData;
    
    // Initialize dancers loading state
    performanceData.forEach(perf => {
      dancersLoaded.value[perf.id] = false;
    });
    
    // Load dancers for all performances
    loadDancersForPerformances(performanceData);
    
  } catch (err) {
    console.error('Error fetching recital show details:', err);
    error.value = err.message || 'Failed to load show details';
  } finally {
    loading.value = false;
  }
}

function loadDancersForPerformances(performancesList) {
  performancesList.forEach(performance => {
    loadDancersForPerformance(performance.id);
  });
}

async function loadDancersForPerformance(performanceId) {
  try {
    const client = useSupabaseClient();
    
    const { data: dancerData, error: dancerError } = await client
      .from('performance_dancers')
      .select('id, dancer_name')
      .eq('performance_id', performanceId);
      
    if (dancerError) {
      console.error(`Error fetching dancers for performance ${performanceId}:`, dancerError);
    } else {
      performanceDancers.value[performanceId] = dancerData || [];
    }
  } catch (err) {
    console.error(`Error fetching dancers for performance ${performanceId}:`, err);
  } finally {
    dancersLoaded.value[performanceId] = true;
  }
}

async function fetchClassInstances() {
  try {
    const client = useSupabaseClient();

    const { data, error: fetchError } = await client
      .from('class_instances')
      .select(
        `
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
      `
      )
      .eq('status', 'active');

    if (fetchError) throw fetchError;

    classInstances.value = data.map((instance) => ({
      ...instance,
      display_name: `${instance.name || instance.class_definition?.name} (${
        instance.class_definition?.dance_style?.name || 'Unknown Style'
      })`
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
  return performance.class_instance?.name || performance.class_instance?.class_definition?.name || 'Unknown Class';
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
    planning: 'warning',
    rehearsal: 'info',
    active: 'success',
    completed: 'success',
    cancelled: 'danger'
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
  // Get the next order number
  let nextOrder = 1;
  if (performances.value.length > 0) {
    const maxOrder = Math.max(...performances.value.map((p) => p.performance_order || 0));
    nextOrder = maxOrder + 1;
  }

  performanceDialog.title = 'Add Performance';
  performanceDialog.isNew = true;
  performanceDialog.data = {
    id: null,
    class_instance_id: null,
    performance_order: nextOrder,
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
    performance_order: performance.performance_order || 0,
    song_title: performance.song_title || '',
    song_artist: performance.song_artist || '',
    choreographer: performance.choreographer || '',
    duration: performance.duration || 120,
    notes: performance.notes || ''
  };
  performanceDialog.visible = true;
}

function viewDancers(performance, dancers) {
  dancersDialog.songTitle = performance.song_title || 'Untitled';
  dancersDialog.choreographer = performance.choreographer || '';
  dancersDialog.dancers = dancers.map(d => d.dancer_name).join(', ');
  dancersDialog.visible = true;
}

function viewDancersFromNotes(performance) {
  dancersDialog.songTitle = performance.song_title || 'Untitled';
  dancersDialog.choreographer = performance.choreographer || '';
  
  if (performance.notes && performance.notes.includes('Dancers:')) {
    dancersDialog.dancers = performance.notes.substring(performance.notes.indexOf('Dancers:') + 8).trim();
  } else {
    dancersDialog.dancers = '';
  }
  
  dancersDialog.visible = true;
}

function formatDancersArray(dancers) {
  if (!dancers || dancers.length === 0) return 'No dancers listed';
  
  // Take first 3 dancers to show in the preview
  const previewDancers = dancers.slice(0, 3);
  const dancerNames = previewDancers.map(d => d.dancer_name);
  
  if (dancers.length > 3) {
    return dancerNames.join(', ') + ` and ${dancers.length - 3} more...`;
  }
  
  return dancerNames.join(', ');
}

function formatDancersList(dancers) {
  if (!dancers) return 'No dancers listed';

  // Split by commas, trim each name, and join with newlines for better readability
  return dancers
    .split(',')
    .map((name) => name.trim())
    .join('\n');
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

    // Check if notes field contains dancer information
    let dancersFromNotes = [];
    let cleanedNotes = values.notes || '';

    if (cleanedNotes && cleanedNotes.includes('Dancers:')) {
      // Extract dancers from notes
      const dancerSection = cleanedNotes.substring(cleanedNotes.indexOf('Dancers:') + 8).trim();
      dancersFromNotes = dancerSection
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name);

      // Remove dancers section from notes to avoid duplication
      cleanedNotes = cleanedNotes.replace(/Dancers:.*$/s, '').trim();
    }

    const performanceData = {
      class_instance_id: values.class_instance_id,
      performance_order: values.performance_order,
      song_title: values.song_title || '',
      song_artist: values.song_artist || '',
      choreographer: values.choreographer || '',
      duration: values.duration || 0,
      notes: cleanedNotes // Use cleaned notes without dancers section
    };

    let performanceId;

    // Use the API service instead of direct Supabase calls
    if (performanceDialog.isNew) {
      // Create new performance
      const { data, error } = await useFetch(`/api/recital-shows/${showId}/performances`, {
        method: 'POST',
        body: {
          ...performanceData
        }
      });

      if (error.value) throw new Error(error.value.statusMessage || 'Failed to create performance');

      // Get performance ID for dancer linking
      performanceId = data.value.performance.id;

      // Add to local array
      performances.value.push(data.value.performance);

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Performance added successfully',
        life: 3000
      });
    } else {
      // Update existing performance
      const { data, error } = await useFetch(`/api/recital-shows/${showId}/performances/${performanceDialog.data.id}`, {
        method: 'PUT',
        body: {
          ...performanceData
        }
      });

      if (error.value) throw new Error(error.value.statusMessage || 'Failed to update performance');

      // Get performance ID for dancer linking
      performanceId = performanceDialog.data.id;

      // Update in local array
      const index = performances.value.findIndex((p) => p.id === performanceDialog.data.id);
      if (index !== -1) {
        performances.value[index] = data.value.performance;
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Performance updated successfully',
        life: 3000
      });
    }

    // Add dancers to performance_dancers table if we have any
    if (dancersFromNotes.length > 0 && performanceId) {
      const client = useSupabaseClient();

      // First delete existing dancers for this performance to avoid duplicates
      await client.from('performance_dancers').delete().eq('performance_id', performanceId);

      // Now add each dancer
      for (const dancerName of dancersFromNotes) {
        const { error: dancerError } = await client.from('performance_dancers').insert({
          performance_id: performanceId,
          dancer_name: dancerName
        });

        if (dancerError) {
          console.error('Error adding dancer:', dancerError);
        }
      }

      // Refresh the performance data to include the new dancers
      fetchRecitalShow();
    }

    // Sort performances by order
    performances.value.sort((a, b) => (a.performance_order || 0) - (b.performance_order || 0));

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
    performances.value = performances.value.filter((p) => p.id !== performance.id);

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

// Handle imported performances
function onPerformancesImported(importedPerformances) {
  if (!importedPerformances || importedPerformances.length === 0) return;

  // Refresh the performances list
  fetchRecitalShow();

  toast.add({
    severity: 'success',
    summary: 'Import Successful',
    detail: `Imported ${importedPerformances.length} performances`,
    life: 3000
  });
}
</script>

<style scoped>
.dancers-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 0.375rem;
}
</style>
