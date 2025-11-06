// composables/useAnalyticsService.ts
// Analytics service for fetching and managing analytics data

export interface DateRangeParams {
  startDate?: string
  endDate?: string
  period?: 'month' | 'quarter' | 'year'
  compareYearAgo?: boolean
}

export function useAnalyticsService() {
  // ============================================================================
  // REVENUE ANALYTICS
  // ============================================================================

  /**
   * Fetch revenue analytics with date range filtering
   * @param params - Date range and filtering parameters
   * @returns Revenue metrics including totals, trends, and breakdowns
   */
  const fetchRevenueAnalytics = async (params: DateRangeParams = {}) => {
    return await useFetch('/api/analytics/revenue', {
      params,
      key: `revenue-analytics-${JSON.stringify(params)}`
    })
  }

  /**
   * Fetch revenue summary for current month, quarter, and year
   * @returns Quick revenue summary metrics
   */
  const fetchRevenueSummary = async () => {
    const today = new Date()
    const startOfYear = new Date(today.getFullYear(), 0, 1)
    return await useFetch('/api/analytics/revenue', {
      params: {
        startDate: startOfYear.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        period: 'month'
      },
      key: 'revenue-summary-current'
    })
  }

  // ============================================================================
  // ENROLLMENT ANALYTICS
  // ============================================================================

  /**
   * Fetch enrollment trends and statistics
   * @param params - Date range parameters
   * @returns Enrollment metrics including trends, capacity, and forecasts
   */
  const fetchEnrollmentAnalytics = async (params: DateRangeParams = {}) => {
    return await useFetch('/api/analytics/enrollment', {
      params,
      key: `enrollment-analytics-${JSON.stringify(params)}`
    })
  }

  /**
   * Fetch enrollment summary for dashboard
   * @returns Quick enrollment metrics
   */
  const fetchEnrollmentSummary = async () => {
    const today = new Date()
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1)
    return await useFetch('/api/analytics/enrollment', {
      params: {
        startDate: sixMonthsAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      key: 'enrollment-summary-current'
    })
  }

  // ============================================================================
  // RETENTION ANALYTICS
  // ============================================================================

  /**
   * Fetch retention metrics and churn analysis
   * @param params - Date range parameters
   * @returns Retention rates, cohort analysis, and at-risk students
   */
  const fetchRetentionAnalytics = async (params: DateRangeParams = {}) => {
    return await useFetch('/api/analytics/retention', {
      params,
      key: `retention-analytics-${JSON.stringify(params)}`
    })
  }

  /**
   * Fetch retention summary for dashboard
   * @returns Quick retention metrics
   */
  const fetchRetentionSummary = async () => {
    return await useFetch('/api/analytics/retention', {
      key: 'retention-summary-current'
    })
  }

  // ============================================================================
  // CLASS PERFORMANCE ANALYTICS
  // ============================================================================

  /**
   * Fetch class performance metrics
   * @param params - Date range parameters
   * @returns Class capacity, profitability, and recommendations
   */
  const fetchClassPerformance = async (params: DateRangeParams = {}) => {
    return await useFetch('/api/analytics/class-performance', {
      params,
      key: `class-performance-${JSON.stringify(params)}`
    })
  }

  /**
   * Fetch class performance summary
   * @returns Quick class metrics
   */
  const fetchClassPerformanceSummary = async () => {
    return await useFetch('/api/analytics/class-performance', {
      key: 'class-performance-summary'
    })
  }

  // ============================================================================
  // TEACHER METRICS
  // ============================================================================

  /**
   * Fetch teacher workload and performance metrics
   * @param params - Date range parameters
   * @returns Teacher workload, revenue contribution, and recommendations
   */
  const fetchTeacherMetrics = async (params: DateRangeParams = {}) => {
    return await useFetch('/api/analytics/teacher-metrics', {
      params,
      key: `teacher-metrics-${JSON.stringify(params)}`
    })
  }

  /**
   * Fetch teacher metrics summary
   * @returns Quick teacher metrics
   */
  const fetchTeacherMetricsSummary = async () => {
    return await useFetch('/api/analytics/teacher-metrics', {
      key: 'teacher-metrics-summary'
    })
  }

  // ============================================================================
  // EXPORT FUNCTIONALITY
  // ============================================================================

  /**
   * Export analytics data to CSV format
   * @param reportType - Type of report to export
   * @param params - Parameters for the report
   * @returns CSV file download
   */
  const exportToCSV = async (reportType: string, params: any = {}) => {
    try {
      const response = await $fetch('/api/analytics/export', {
        method: 'POST',
        body: {
          reportType,
          format: 'csv',
          ...params
        }
      })
      return response
    } catch (error) {
      console.error('Export to CSV failed:', error)
      throw error
    }
  }

  /**
   * Export analytics data to Excel format
   * @param reportType - Type of report to export
   * @param params - Parameters for the report
   * @returns Excel file download
   */
  const exportToExcel = async (reportType: string, params: any = {}) => {
    try {
      const response = await $fetch('/api/analytics/export', {
        method: 'POST',
        body: {
          reportType,
          format: 'excel',
          ...params
        }
      })
      return response
    } catch (error) {
      console.error('Export to Excel failed:', error)
      throw error
    }
  }

  /**
   * Export analytics data to PDF format
   * @param reportType - Type of report to export
   * @param params - Parameters for the report
   * @returns PDF file download
   */
  const exportToPDF = async (reportType: string, params: any = {}) => {
    try {
      const response = await $fetch('/api/analytics/export', {
        method: 'POST',
        body: {
          reportType,
          format: 'pdf',
          ...params
        }
      })
      return response
    } catch (error) {
      console.error('Export to PDF failed:', error)
      throw error
    }
  }

  // ============================================================================
  // CUSTOM REPORTS
  // ============================================================================

  /**
   * Execute a custom report query
   * @param reportConfig - Custom report configuration
   * @returns Report data
   */
  const executeCustomReport = async (reportConfig: any) => {
    try {
      const response = await $fetch('/api/analytics/custom-report', {
        method: 'POST',
        body: reportConfig
      })
      return response
    } catch (error) {
      console.error('Custom report execution failed:', error)
      throw error
    }
  }

  /**
   * Save a custom report template
   * @param template - Report template configuration
   * @returns Saved template ID
   */
  const saveReportTemplate = async (template: any) => {
    try {
      const response = await $fetch('/api/analytics/templates', {
        method: 'POST',
        body: template
      })
      return response
    } catch (error) {
      console.error('Save report template failed:', error)
      throw error
    }
  }

  /**
   * Fetch saved report templates
   * @returns List of saved templates
   */
  const fetchReportTemplates = async () => {
    return await useFetch('/api/analytics/templates', {
      key: 'report-templates'
    })
  }

  /**
   * Delete a saved report template
   * @param templateId - Template ID to delete
   */
  const deleteReportTemplate = async (templateId: string) => {
    try {
      await $fetch(`/api/analytics/templates/${templateId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('Delete report template failed:', error)
      throw error
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Format date range for display
   * @param startDate - Start date string
   * @param endDate - End date string
   * @returns Formatted date range string
   */
  const formatDateRange = (startDate: string, endDate: string): string => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
    return `${formatter.format(start)} - ${formatter.format(end)}`
  }

  /**
   * Format currency for display
   * @param cents - Amount in cents
   * @returns Formatted currency string
   */
  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  /**
   * Format percentage for display
   * @param value - Percentage value
   * @param decimals - Number of decimal places
   * @returns Formatted percentage string
   */
  const formatPercentage = (value: number, decimals: number = 1): string => {
    return `${value.toFixed(decimals)}%`
  }

  /**
   * Calculate percentage change
   * @param current - Current value
   * @param previous - Previous value
   * @returns Percentage change
   */
  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  /**
   * Get default date range (last 12 months)
   * @returns Date range object
   */
  const getDefaultDateRange = (): DateRangeParams => {
    const today = new Date()
    const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 12, 1)
    return {
      startDate: twelveMonthsAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      period: 'month'
    }
  }

  /**
   * Get date range presets
   * @returns Array of common date range presets
   */
  const getDateRangePresets = () => {
    const today = new Date()
    return {
      'Last 30 Days': {
        startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30).toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      'Last 90 Days': {
        startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90).toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      'Last 6 Months': {
        startDate: new Date(today.getFullYear(), today.getMonth() - 6, 1).toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      'Last 12 Months': {
        startDate: new Date(today.getFullYear(), today.getMonth() - 12, 1).toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      'This Month': {
        startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      'This Quarter': {
        startDate: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1).toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      'This Year': {
        startDate: new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      'Last Year': {
        startDate: new Date(today.getFullYear() - 1, 0, 1).toISOString().split('T')[0],
        endDate: new Date(today.getFullYear() - 1, 11, 31).toISOString().split('T')[0]
      }
    }
  }

  // ============================================================================
  // RETURN PUBLIC API
  // ============================================================================

  return {
    // Revenue
    fetchRevenueAnalytics,
    fetchRevenueSummary,

    // Enrollment
    fetchEnrollmentAnalytics,
    fetchEnrollmentSummary,

    // Retention
    fetchRetentionAnalytics,
    fetchRetentionSummary,

    // Class Performance
    fetchClassPerformance,
    fetchClassPerformanceSummary,

    // Teacher Metrics
    fetchTeacherMetrics,
    fetchTeacherMetricsSummary,

    // Export
    exportToCSV,
    exportToExcel,
    exportToPDF,

    // Custom Reports
    executeCustomReport,
    saveReportTemplate,
    fetchReportTemplates,
    deleteReportTemplate,

    // Utilities
    formatDateRange,
    formatCurrency,
    formatPercentage,
    calculatePercentageChange,
    getDefaultDateRange,
    getDateRangePresets
  }
}
