// composables/usePayrollService.ts
import type {
  TeacherPayRate,
  CreateTeacherPayRateInput,
  UpdateTeacherPayRateInput,
  PayrollPeriod,
  CreatePayrollPeriodInput,
  UpdatePayrollPeriodInput,
  PayrollTimeEntry,
  CreateTimeEntryInput,
  PayrollAdjustment,
  CreateAdjustmentInput,
  PayrollPayStub,
  PayrollPeriodFilters,
  TimeEntryFilters,
  AdjustmentFilters,
  PayStubFilters
} from '~/types/payroll'

export function usePayrollService() {
  const config = useRuntimeConfig()

  // =====================================================
  // PAY RATES
  // =====================================================

  const fetchPayRates = async (params?: { teacher_id?: string; current_only?: boolean }) => {
    const { data, error } = await useFetch('/api/payroll/pay-rates', {
      params,
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to fetch pay rates')
    }

    return data.value?.data as TeacherPayRate[]
  }

  const createPayRate = async (input: CreateTeacherPayRateInput) => {
    const { data, error } = await useFetch('/api/payroll/pay-rates', {
      method: 'POST',
      body: input,
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to create pay rate')
    }

    return data.value?.data as TeacherPayRate
  }

  const updatePayRate = async (id: string, input: Partial<UpdateTeacherPayRateInput>) => {
    const { data, error } = await useFetch(`/api/payroll/pay-rates/${id}`, {
      method: 'PUT',
      body: input,
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to update pay rate')
    }

    return data.value?.data as TeacherPayRate
  }

  // =====================================================
  // PAYROLL PERIODS
  // =====================================================

  const fetchPayrollPeriods = async (filters?: PayrollPeriodFilters) => {
    const { data, error } = await useFetch('/api/payroll/periods', {
      params: filters,
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to fetch payroll periods')
    }

    return data.value?.data as PayrollPeriod[]
  }

  const createPayrollPeriod = async (input: CreatePayrollPeriodInput) => {
    const { data, error } = await useFetch('/api/payroll/periods', {
      method: 'POST',
      body: input,
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to create payroll period')
    }

    return data.value?.data as PayrollPeriod
  }

  const updatePayrollPeriod = async (id: string, input: Partial<UpdatePayrollPeriodInput>) => {
    const { data, error } = await useFetch(`/api/payroll/periods/${id}`, {
      method: 'PUT',
      body: input,
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to update payroll period')
    }

    return data.value?.data as PayrollPeriod
  }

  // =====================================================
  // TIME ENTRIES
  // =====================================================

  const fetchTimeEntries = async (filters?: TimeEntryFilters) => {
    const { data, error } = await useFetch('/api/payroll/time-entries', {
      params: filters,
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to fetch time entries')
    }

    return data.value?.data as PayrollTimeEntry[]
  }

  const generateTimeEntries = async (payroll_period_id: string, schedule_id?: string) => {
    const { data, error } = await useFetch('/api/payroll/time-entries/generate', {
      method: 'POST',
      body: { payroll_period_id, schedule_id },
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to generate time entries')
    }

    return data.value
  }

  const createTimeEntry = async (input: CreateTimeEntryInput) => {
    const { data, error } = await useFetch('/api/payroll/time-entries', {
      method: 'POST',
      body: input,
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to create time entry')
    }

    return data.value?.data as PayrollTimeEntry
  }

  const updateTimeEntry = async (id: string, input: Partial<CreateTimeEntryInput>) => {
    const { data, error } = await useFetch(`/api/payroll/time-entries/${id}`, {
      method: 'PUT',
      body: input,
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to update time entry')
    }

    return data.value?.data as PayrollTimeEntry
  }

  const approveTimeEntry = async (id: string) => {
    return updateTimeEntry(id, { status: 'approved' })
  }

  // =====================================================
  // ADJUSTMENTS
  // =====================================================

  const fetchAdjustments = async (filters?: AdjustmentFilters) => {
    const { data, error } = await useFetch('/api/payroll/adjustments', {
      params: filters,
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to fetch adjustments')
    }

    return data.value?.data as PayrollAdjustment[]
  }

  const createAdjustment = async (input: CreateAdjustmentInput) => {
    const { data, error } = await useFetch('/api/payroll/adjustments', {
      method: 'POST',
      body: input,
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to create adjustment')
    }

    return data.value?.data as PayrollAdjustment
  }

  const updateAdjustment = async (id: string, input: Partial<CreateAdjustmentInput>) => {
    const { data, error } = await useFetch(`/api/payroll/adjustments/${id}`, {
      method: 'PUT',
      body: input,
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to update adjustment')
    }

    return data.value?.data as PayrollAdjustment
  }

  const approveAdjustment = async (id: string) => {
    return updateAdjustment(id, { status: 'approved' })
  }

  // =====================================================
  // PAY STUBS
  // =====================================================

  const fetchPayStubs = async (filters?: PayStubFilters) => {
    const { data, error } = await useFetch('/api/payroll/pay-stubs', {
      params: filters,
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to fetch pay stubs')
    }

    return data.value?.data as PayrollPayStub[]
  }

  const generatePayStubs = async (payroll_period_id: string, teacher_ids?: string[]) => {
    const { data, error } = await useFetch('/api/payroll/pay-stubs/generate', {
      method: 'POST',
      body: { payroll_period_id, teacher_ids },
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to generate pay stubs')
    }

    return data.value
  }

  const getPayStubDetails = async (id: string) => {
    const { data, error } = await useFetch(`/api/payroll/pay-stubs/${id}`, {
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to fetch pay stub details')
    }

    return data.value?.data
  }

  // =====================================================
  // EXPORT
  // =====================================================

  const exportPayroll = async (payroll_period_id: string, export_type: string = 'csv') => {
    const { data, error } = await useFetch('/api/payroll/export', {
      method: 'POST',
      body: { payroll_period_id, export_type },
      server: false
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to export payroll')
    }

    return data.value?.data
  }

  const downloadPayrollExport = (fileName: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  const calculatePayrollSummary = (period: PayrollPeriod) => {
    return {
      total_pay: period.total_regular_pay + period.total_overtime_pay + period.total_adjustments,
      total_hours: period.total_hours,
      average_hourly_rate: period.total_hours > 0
        ? (period.total_regular_pay + period.total_overtime_pay) / period.total_hours
        : 0
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)} hrs`
  }

  return {
    // Pay Rates
    fetchPayRates,
    createPayRate,
    updatePayRate,

    // Payroll Periods
    fetchPayrollPeriods,
    createPayrollPeriod,
    updatePayrollPeriod,

    // Time Entries
    fetchTimeEntries,
    generateTimeEntries,
    createTimeEntry,
    updateTimeEntry,
    approveTimeEntry,

    // Adjustments
    fetchAdjustments,
    createAdjustment,
    updateAdjustment,
    approveAdjustment,

    // Pay Stubs
    fetchPayStubs,
    generatePayStubs,
    getPayStubDetails,

    // Export
    exportPayroll,
    downloadPayrollExport,

    // Utilities
    calculatePayrollSummary,
    formatCurrency,
    formatHours
  }
}
