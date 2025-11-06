<script setup lang="ts">
import type { TeacherPayRate, Teacher } from '~/types'

definePageMeta({
  middleware: 'admin'
})

const { can } = usePermissions()
const payrollService = usePayrollService()
const apiService = useApiService()
const toast = useToast()

// State
const payRates = ref<TeacherPayRate[]>([])
const teachers = ref<Teacher[]>([])
const loading = ref(false)
const showCreateDialog = ref(false)
const editingRate = ref<TeacherPayRate | null>(null)

// Filters
const teacherFilter = ref<string | null>(null)
const currentOnlyFilter = ref(true)

// Load data
const loadPayRates = async () => {
  try {
    loading.value = true
    const params: any = {}

    if (teacherFilter.value) {
      params.teacher_id = teacherFilter.value
    }

    if (currentOnlyFilter.value) {
      params.current_only = true
    }

    payRates.value = await payrollService.fetchPayRates(params)
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message,
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const loadTeachers = async () => {
  try {
    const response = await apiService.fetchTeachers()
    teachers.value = response.data || []
  } catch (error: any) {
    console.error('Failed to load teachers:', error)
  }
}

// Create rate
const createRate = async (rateData: any) => {
  try {
    await payrollService.createPayRate(rateData)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Pay rate created successfully',
      life: 3000
    })
    showCreateDialog.value = false
    await loadPayRates()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message,
      life: 3000
    })
  }
}

// Edit rate
const editRate = (rate: TeacherPayRate) => {
  editingRate.value = rate
  showCreateDialog.value = true
}

// Update rate
const updateRate = async (rateData: any) => {
  if (!editingRate.value) return

  try {
    await payrollService.updatePayRate(editingRate.value.id, rateData)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Pay rate updated successfully',
      life: 3000
    })
    showCreateDialog.value = false
    editingRate.value = null
    await loadPayRates()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message,
      life: 3000
    })
  }
}

onMounted(() => {
  loadPayRates()
  loadTeachers()
})

watch([teacherFilter, currentOnlyFilter], () => {
  loadPayRates()
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <Button
          icon="pi pi-arrow-left"
          text
          @click="$router.push('/payroll')"
          class="mb-2"
        />
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Teacher Pay Rates</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">Manage teacher compensation rates</p>
      </div>
      <Button
        v-if="can('canManagePayRates')"
        label="Add Pay Rate"
        icon="pi pi-plus"
        @click="showCreateDialog = true"
      />
    </div>

    <!-- Filters -->
    <div class="flex gap-4 mb-6">
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Teacher</label>
        <Select
          v-model="teacherFilter"
          :options="[{ id: null, first_name: 'All', last_name: 'Teachers' }, ...teachers]"
          optionLabel="first_name"
          optionValue="id"
          class="w-full"
        >
          <template #value="{ value }">
            <span v-if="value === null">All Teachers</span>
            <span v-else>
              {{ teachers.find(t => t.id === value)?.first_name }} {{ teachers.find(t => t.id === value)?.last_name }}
            </span>
          </template>
          <template #option="{ option }">
            {{ option.first_name }} {{ option.last_name }}
          </template>
        </Select>
      </div>
      <div class="flex items-end">
        <div class="flex items-center gap-2">
          <Checkbox v-model="currentOnlyFilter" inputId="current-only" binary />
          <label for="current-only" class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Current rates only
          </label>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <ProgressSpinner />
    </div>

    <!-- Pay Rates Table -->
    <DataTable v-else :value="payRates" stripedRows>
      <Column field="teacher" header="Teacher">
        <template #body="{ data }">
          {{ data.teacher?.first_name }} {{ data.teacher?.last_name }}
        </template>
      </Column>
      <Column field="rate_type" header="Rate Type">
        <template #body="{ data }">
          <Tag :value="data.rate_type" />
        </template>
      </Column>
      <Column field="rate_amount" header="Rate">
        <template #body="{ data }">
          {{ payrollService.formatCurrency(data.rate_amount) }}
          <span v-if="data.rate_type === 'hourly'"> / hour</span>
          <span v-else-if="data.rate_type === 'per_class'"> / class</span>
          <span v-else> / year</span>
        </template>
      </Column>
      <Column field="effective_from" header="Effective From">
        <template #body="{ data }">
          {{ new Date(data.effective_from).toLocaleDateString() }}
        </template>
      </Column>
      <Column field="effective_to" header="Effective To">
        <template #body="{ data }">
          <span v-if="data.effective_to">{{ new Date(data.effective_to).toLocaleDateString() }}</span>
          <Tag v-else value="Current" severity="success" />
        </template>
      </Column>
      <Column field="overtime_enabled" header="Overtime">
        <template #body="{ data }">
          <i v-if="data.overtime_enabled" class="pi pi-check text-green-600"></i>
          <i v-else class="pi pi-times text-gray-400"></i>
        </template>
      </Column>
      <Column header="Actions">
        <template #body="{ data }">
          <Button
            v-if="can('canManagePayRates')"
            icon="pi pi-pencil"
            text
            rounded
            @click="editRate(data)"
          />
        </template>
      </Column>
    </DataTable>

    <!-- Create/Edit Dialog -->
    <PayrollPayRateDialog
      v-model:visible="showCreateDialog"
      :teachers="teachers"
      :editing-rate="editingRate"
      @created="createRate"
      @updated="updateRate"
      @closed="editingRate = null"
    />
  </div>
</template>
