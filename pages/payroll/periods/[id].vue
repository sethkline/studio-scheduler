<script setup lang="ts">
import type { PayrollPeriod, PayrollTimeEntry, PayrollAdjustment, PayrollPayStub } from '~/types/payroll'

definePageMeta({
  middleware: 'admin'
})

const route = useRoute()
const { can } = usePermissions()
const payrollService = usePayrollService()
const toast = useToast()

// State
const period = ref<PayrollPeriod | null>(null)
const timeEntries = ref<PayrollTimeEntry[]>([])
const adjustments = ref<PayrollAdjustment[]>([])
const payStubs = ref<PayrollPayStub[]>([])
const loading = ref(false)
const activeTab = ref(0)

const periodId = route.params.id as string

// Load data
const loadPeriodData = async () => {
  try {
    loading.value = true

    // Load period
    const periods = await payrollService.fetchPayrollPeriods()
    period.value = periods.find(p => p.id === periodId) || null

    // Load time entries
    timeEntries.value = await payrollService.fetchTimeEntries({ payroll_period_id: periodId })

    // Load adjustments
    adjustments.value = await payrollService.fetchAdjustments({ payroll_period_id: periodId })

    // Load pay stubs
    payStubs.value = await payrollService.fetchPayStubs({ payroll_period_id: periodId })
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

// Generate time entries
const generateEntries = async () => {
  try {
    const result = await payrollService.generateTimeEntries(periodId)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: result.message,
      life: 3000
    })
    await loadPeriodData()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message,
      life: 3000
    })
  }
}

// Generate pay stubs
const generateStubs = async () => {
  try {
    const result = await payrollService.generatePayStubs(periodId)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: result.message,
      life: 3000
    })
    await loadPeriodData()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message,
      life: 3000
    })
  }
}

// Export
const exportPayroll = async (exportType: string = 'csv') => {
  try {
    const result = await payrollService.exportPayroll(periodId, exportType)
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

onMounted(() => {
  loadPeriodData()
})
</script>

<template>
  <div class="p-6">
    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <ProgressSpinner />
    </div>

    <div v-else-if="period">
      <!-- Header -->
      <div class="flex justify-between items-start mb-6">
        <div>
          <Button
            icon="pi pi-arrow-left"
            text
            @click="$router.push('/payroll')"
            class="mb-2"
          />
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ period.period_name }}</h1>
          <div class="flex gap-2 mt-2">
            <Tag :value="period.status" />
            <Tag :value="period.period_type" severity="info" />
          </div>
        </div>

        <div class="flex gap-2">
          <Button
            label="Generate Time Entries"
            icon="pi pi-calendar"
            outlined
            @click="generateEntries"
            v-if="can('canManagePayroll')"
          />
          <Button
            label="Generate Pay Stubs"
            icon="pi pi-file"
            outlined
            @click="generateStubs"
            v-if="can('canManagePayroll')"
          />
          <Button
            label="Export"
            icon="pi pi-download"
            @click="exportPayroll()"
            v-if="can('canExportPayroll')"
          />
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <template #content>
            <div class="text-center">
              <div class="text-sm text-gray-600 dark:text-gray-400">Total Hours</div>
              <div class="text-2xl font-bold mt-2">{{ payrollService.formatHours(period.total_hours) }}</div>
            </div>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="text-center">
              <div class="text-sm text-gray-600 dark:text-gray-400">Regular Pay</div>
              <div class="text-2xl font-bold mt-2">{{ payrollService.formatCurrency(period.total_regular_pay) }}</div>
            </div>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="text-center">
              <div class="text-sm text-gray-600 dark:text-gray-400">Overtime Pay</div>
              <div class="text-2xl font-bold mt-2">{{ payrollService.formatCurrency(period.total_overtime_pay) }}</div>
            </div>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="text-center">
              <div class="text-sm text-gray-600 dark:text-gray-400">Gross Pay</div>
              <div class="text-2xl font-bold mt-2 text-green-600">{{ payrollService.formatCurrency(period.total_gross_pay) }}</div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Tabs -->
      <TabView v-model:activeIndex="activeTab">
        <!-- Time Entries Tab -->
        <TabPanel header="Time Entries">
          <DataTable :value="timeEntries" stripedRows>
            <Column field="teacher.first_name" header="Teacher">
              <template #body="{ data }">
                {{ data.teacher?.first_name }} {{ data.teacher?.last_name }}
              </template>
            </Column>
            <Column field="entry_date" header="Date">
              <template #body="{ data }">
                {{ new Date(data.entry_date).toLocaleDateString() }}
              </template>
            </Column>
            <Column field="hours" header="Hours">
              <template #body="{ data }">
                {{ payrollService.formatHours(data.hours) }}
              </template>
            </Column>
            <Column field="regular_pay" header="Regular Pay">
              <template #body="{ data }">
                {{ payrollService.formatCurrency(data.regular_pay) }}
              </template>
            </Column>
            <Column field="overtime_pay" header="Overtime Pay">
              <template #body="{ data }">
                {{ payrollService.formatCurrency(data.overtime_pay) }}
              </template>
            </Column>
            <Column field="entry_type" header="Type">
              <template #body="{ data }">
                <Tag :value="data.entry_type" />
              </template>
            </Column>
            <Column field="status" header="Status">
              <template #body="{ data }">
                <Tag :value="data.status" :severity="data.status === 'approved' ? 'success' : 'warning'" />
              </template>
            </Column>
          </DataTable>
        </TabPanel>

        <!-- Adjustments Tab -->
        <TabPanel header="Adjustments">
          <DataTable :value="adjustments" stripedRows>
            <Column field="teacher.first_name" header="Teacher">
              <template #body="{ data }">
                {{ data.teacher?.first_name }} {{ data.teacher?.last_name }}
              </template>
            </Column>
            <Column field="adjustment_type" header="Type">
              <template #body="{ data }">
                <Tag :value="data.adjustment_type" />
              </template>
            </Column>
            <Column field="description" header="Description" />
            <Column field="amount" header="Amount">
              <template #body="{ data }">
                {{ payrollService.formatCurrency(data.amount) }}
              </template>
            </Column>
            <Column field="status" header="Status">
              <template #body="{ data }">
                <Tag :value="data.status" :severity="data.status === 'approved' ? 'success' : 'warning'" />
              </template>
            </Column>
          </DataTable>
        </TabPanel>

        <!-- Pay Stubs Tab -->
        <TabPanel header="Pay Stubs">
          <DataTable :value="payStubs" stripedRows>
            <Column field="stub_number" header="Stub #" />
            <Column field="teacher.first_name" header="Teacher">
              <template #body="{ data }">
                {{ data.teacher?.first_name }} {{ data.teacher?.last_name }}
              </template>
            </Column>
            <Column field="regular_hours" header="Hours">
              <template #body="{ data }">
                {{ payrollService.formatHours(data.regular_hours + data.overtime_hours) }}
              </template>
            </Column>
            <Column field="gross_pay" header="Gross Pay">
              <template #body="{ data }">
                {{ payrollService.formatCurrency(data.gross_pay) }}
              </template>
            </Column>
            <Column field="net_pay" header="Net Pay">
              <template #body="{ data }">
                {{ payrollService.formatCurrency(data.net_pay) }}
              </template>
            </Column>
            <Column field="status" header="Status">
              <template #body="{ data }">
                <Tag :value="data.status" />
              </template>
            </Column>
          </DataTable>
        </TabPanel>
      </TabView>
    </div>
  </div>
</template>
