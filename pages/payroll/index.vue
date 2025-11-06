<script setup lang="ts">
import type { PayrollPeriod } from '~/types/payroll'

definePageMeta({
  middleware: 'admin'
})

const { can } = usePermissions()
const payrollService = usePayrollService()
const toast = useToast()

// State
const periods = ref<PayrollPeriod[]>([])
const loading = ref(false)
const showCreateDialog = ref(false)

// Filters
const statusFilter = ref('all')
const periodTypeFilter = ref('all')

// Load payroll periods
const loadPeriods = async () => {
  try {
    loading.value = true
    const filters: any = {}

    if (statusFilter.value !== 'all') {
      filters.status = statusFilter.value
    }

    if (periodTypeFilter.value !== 'all') {
      filters.period_type = periodTypeFilter.value
    }

    periods.value = await payrollService.fetchPayrollPeriods(filters)
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

// Create new period
const createPeriod = async (periodData: any) => {
  try {
    await payrollService.createPayrollPeriod(periodData)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Payroll period created successfully',
      life: 3000
    })
    showCreateDialog.value = false
    await loadPeriods()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message,
      life: 3000
    })
  }
}

// View period details
const viewPeriod = (periodId: string) => {
  navigateTo(`/payroll/periods/${periodId}`)
}

// Export payroll
const exportPeriod = async (period: PayrollPeriod, exportType: string = 'csv') => {
  try {
    const result = await payrollService.exportPayroll(period.id, exportType)
    payrollService.downloadPayrollExport(result.file_name, result.content, result.mime_type)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Exported ${result.record_count} records`,
      life: 3000
    })
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message,
      life: 3000
    })
  }
}

// Status badge severity
const getStatusSeverity = (status: string) => {
  const severityMap: Record<string, string> = {
    draft: 'secondary',
    processing: 'info',
    approved: 'success',
    paid: 'success',
    closed: 'secondary'
  }
  return severityMap[status] || 'secondary'
}

// Load periods on mount
onMounted(() => {
  loadPeriods()
})

// Watch filters
watch([statusFilter, periodTypeFilter], () => {
  loadPeriods()
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Payroll Management</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">Manage payroll periods, time entries, and pay stubs</p>
      </div>
      <div class="flex gap-2">
        <Button
          v-if="can('canManagePayRates')"
          label="Manage Pay Rates"
          icon="pi pi-dollar"
          outlined
          @click="$router.push('/payroll/pay-rates')"
        />
        <Button
          v-if="can('canManagePayroll')"
          label="New Period"
          icon="pi pi-plus"
          @click="showCreateDialog = true"
        />
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-4 mb-6">
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
        <Select
          v-model="statusFilter"
          :options="[
            { label: 'All Statuses', value: 'all' },
            { label: 'Draft', value: 'draft' },
            { label: 'Processing', value: 'processing' },
            { label: 'Approved', value: 'approved' },
            { label: 'Paid', value: 'paid' },
            { label: 'Closed', value: 'closed' }
          ]"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period Type</label>
        <Select
          v-model="periodTypeFilter"
          :options="[
            { label: 'All Types', value: 'all' },
            { label: 'Weekly', value: 'weekly' },
            { label: 'Bi-Weekly', value: 'bi-weekly' },
            { label: 'Semi-Monthly', value: 'semi-monthly' },
            { label: 'Monthly', value: 'monthly' }
          ]"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <ProgressSpinner />
    </div>

    <!-- Periods List -->
    <div v-else-if="periods.length > 0" class="grid gap-4">
      <Card v-for="period in periods" :key="period.id" class="hover:shadow-lg transition-shadow">
        <template #content>
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-xl font-semibold">{{ period.period_name }}</h3>
                <Tag :value="period.status" :severity="getStatusSeverity(period.status)" />
                <Tag :value="period.period_type" severity="info" />
              </div>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <span class="text-sm text-gray-600 dark:text-gray-400">Period</span>
                  <p class="font-medium">
                    {{ new Date(period.start_date).toLocaleDateString() }} -
                    {{ new Date(period.end_date).toLocaleDateString() }}
                  </p>
                </div>
                <div>
                  <span class="text-sm text-gray-600 dark:text-gray-400">Pay Date</span>
                  <p class="font-medium">{{ new Date(period.pay_date).toLocaleDateString() }}</p>
                </div>
                <div>
                  <span class="text-sm text-gray-600 dark:text-gray-400">Total Hours</span>
                  <p class="font-medium">{{ payrollService.formatHours(period.total_hours) }}</p>
                </div>
                <div>
                  <span class="text-sm text-gray-600 dark:text-gray-400">Gross Pay</span>
                  <p class="font-medium">{{ payrollService.formatCurrency(period.total_gross_pay) }}</p>
                </div>
              </div>

              <div v-if="period.notes" class="mt-3 text-sm text-gray-600 dark:text-gray-400">
                <strong>Notes:</strong> {{ period.notes }}
              </div>
            </div>

            <div class="flex gap-2">
              <Button
                icon="pi pi-eye"
                text
                rounded
                @click="viewPeriod(period.id)"
                v-tooltip.top="'View Details'"
              />
              <Button
                v-if="can('canExportPayroll')"
                icon="pi pi-download"
                text
                rounded
                @click="exportPeriod(period)"
                v-tooltip.top="'Export'"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Empty State -->
    <Card v-else>
      <template #content>
        <div class="text-center py-8">
          <i class="pi pi-calendar text-6xl text-gray-400 mb-4"></i>
          <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Payroll Periods</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">Get started by creating your first payroll period</p>
          <Button
            v-if="can('canManagePayroll')"
            label="Create Period"
            icon="pi pi-plus"
            @click="showCreateDialog = true"
          />
        </div>
      </template>
    </Card>

    <!-- Create Period Dialog -->
    <PayrollCreatePeriodDialog
      v-model:visible="showCreateDialog"
      @created="createPeriod"
    />
  </div>
</template>
