<template>
  <div class="evaluations-list">
    <!-- Filters -->
    <Card class="mb-4">
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="field">
            <label class="font-medium text-sm mb-1 block">Class</label>
            <Select
              v-model="filters.class_instance_id"
              :options="classInstances"
              optionLabel="name"
              optionValue="id"
              placeholder="All Classes"
              class="w-full"
              @update:modelValue="applyFilters"
            />
          </div>

          <div class="field">
            <label class="font-medium text-sm mb-1 block">Term</label>
            <Select
              v-model="filters.schedule_id"
              :options="schedules"
              optionLabel="name"
              optionValue="id"
              placeholder="All Terms"
              class="w-full"
              @update:modelValue="applyFilters"
            />
          </div>

          <div class="field">
            <label class="font-medium text-sm mb-1 block">Status</label>
            <Select
              v-model="filters.status"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Status"
              class="w-full"
              @update:modelValue="applyFilters"
            />
          </div>

          <div class="field flex items-end">
            <Button
              label="Clear Filters"
              icon="pi pi-filter-slash"
              severity="secondary"
              @click="clearFilters"
              class="w-full"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Empty State -->
    <div v-else-if="!evaluations || evaluations.length === 0" class="text-center py-12">
      <i class="pi pi-file-edit text-6xl text-surface-400 mb-4"></i>
      <h3 class="text-xl font-semibold mb-2">No Evaluations Found</h3>
      <p class="text-surface-600 dark:text-surface-400 mb-4">
        {{ hasFilters ? 'Try adjusting your filters' : 'Create your first evaluation to get started' }}
      </p>
      <Button
        v-if="!hasFilters"
        label="Create Evaluation"
        icon="pi pi-plus"
        @click="$emit('create')"
      />
    </div>

    <!-- Evaluations DataTable -->
    <DataTable
      v-else
      :value="evaluations"
      :loading="loading"
      stripedRows
      paginator
      :rows="20"
      :rowsPerPageOptions="[10, 20, 50]"
      :totalRecords="totalRecords"
      @page="onPage"
      class="p-datatable-sm"
    >
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">Evaluations</h2>
          <Button
            label="New Evaluation"
            icon="pi pi-plus"
            @click="$emit('create')"
          />
        </div>
      </template>

      <Column field="student" header="Student" sortable>
        <template #body="slotProps">
          <div class="font-medium">
            {{ slotProps.data.student?.first_name }} {{ slotProps.data.student?.last_name }}
          </div>
        </template>
      </Column>

      <Column field="class_instance" header="Class" sortable>
        <template #body="slotProps">
          {{ slotProps.data.class_instance?.name }}
        </template>
      </Column>

      <Column field="schedule" header="Term" sortable>
        <template #body="slotProps">
          {{ slotProps.data.schedule?.name || 'N/A' }}
        </template>
      </Column>

      <Column field="overall_rating" header="Overall" sortable>
        <template #body="slotProps">
          <div v-if="slotProps.data.overall_rating" class="flex items-center gap-1">
            <Rating :modelValue="slotProps.data.overall_rating" :readonly="true" :cancel="false" :stars="5" />
            <span class="text-sm text-surface-600 dark:text-surface-400">
              ({{ slotProps.data.overall_rating }}/5)
            </span>
          </div>
          <span v-else class="text-surface-400">-</span>
        </template>
      </Column>

      <Column field="status" header="Status" sortable>
        <template #body="slotProps">
          <Tag
            :value="slotProps.data.status"
            :severity="slotProps.data.status === 'submitted' ? 'success' : 'warning'"
          />
        </template>
      </Column>

      <Column field="created_at" header="Date" sortable>
        <template #body="slotProps">
          {{ formatDate(slotProps.data.created_at) }}
        </template>
      </Column>

      <Column header="Actions" :exportable="false" style="min-width: 12rem">
        <template #body="slotProps">
          <div class="flex gap-2">
            <Button
              icon="pi pi-eye"
              severity="info"
              text
              rounded
              @click="$emit('view', slotProps.data)"
              v-tooltip.top="'View'"
            />
            <Button
              v-if="canEdit(slotProps.data)"
              icon="pi pi-pencil"
              severity="secondary"
              text
              rounded
              @click="$emit('edit', slotProps.data)"
              v-tooltip.top="'Edit'"
            />
            <Button
              v-if="canDelete(slotProps.data)"
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              @click="confirmDelete(slotProps.data)"
              v-tooltip.top="'Delete'"
            />
            <Button
              icon="pi pi-download"
              severity="secondary"
              text
              rounded
              @click="$emit('download', slotProps.data)"
              v-tooltip.top="'Download PDF'"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm'
import type { EvaluationWithSkills, EvaluationFilters } from '~/types/assessment'

const props = defineProps<{
  evaluations?: EvaluationWithSkills[]
  loading?: boolean
  totalRecords?: number
  classInstances?: Array<{ id: string; name: string }>
  schedules?: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
  (e: 'create'): void
  (e: 'view', evaluation: EvaluationWithSkills): void
  (e: 'edit', evaluation: EvaluationWithSkills): void
  (e: 'delete', evaluation: EvaluationWithSkills): void
  (e: 'download', evaluation: EvaluationWithSkills): void
  (e: 'filter', filters: EvaluationFilters): void
  (e: 'page', event: any): void
}>()

const confirm = useConfirm()
const { hasRole } = usePermissions()

const filters = ref<EvaluationFilters>({
  class_instance_id: undefined,
  schedule_id: undefined,
  status: undefined
})

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' }
]

const hasFilters = computed(() => {
  return Object.values(filters.value).some(v => v !== undefined && v !== '')
})

function applyFilters() {
  emit('filter', filters.value)
}

function clearFilters() {
  filters.value = {
    class_instance_id: undefined,
    schedule_id: undefined,
    status: undefined
  }
  applyFilters()
}

function onPage(event: any) {
  emit('page', event)
}

function canEdit(evaluation: EvaluationWithSkills): boolean {
  // Teachers can only edit their own draft evaluations
  // Admin/Staff can edit all
  if (hasRole(['admin', 'staff'])) {
    return true
  }
  return evaluation.status === 'draft'
}

function canDelete(evaluation: EvaluationWithSkills): boolean {
  // Teachers can only delete their own draft evaluations
  // Admin/Staff can delete all
  if (hasRole(['admin', 'staff'])) {
    return true
  }
  return evaluation.status === 'draft'
}

function confirmDelete(evaluation: EvaluationWithSkills) {
  confirm.require({
    message: `Are you sure you want to delete the evaluation for ${evaluation.student?.first_name} ${evaluation.student?.last_name}?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      emit('delete', evaluation)
    }
  })
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.evaluations-list {
  width: 100%;
}
</style>
