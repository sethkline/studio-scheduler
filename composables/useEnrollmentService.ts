/**
 * Enrollment Service Composable
 * Handles all enrollment request and enrollment management operations
 */

export interface EnrollmentRequest {
  id: string
  status: 'pending' | 'approved' | 'denied' | 'waitlist' | 'cancelled'
  requestedAt: string
  processedAt?: string
  hasScheduleConflict: boolean
  conflictDetails?: any
  notes?: string
  adminNotes?: string
  denialReason?: string
  student: {
    id: string
    firstName: string
    lastName: string
    fullName: string
    dateOfBirth?: string
    age?: number
  }
  guardian?: {
    id: string
    firstName: string
    lastName: string
    fullName: string
    email?: string
    phone?: string
  }
  class: {
    id: string
    name: string
    description?: string
    duration?: number
    maxStudents?: number
    currentEnrollments?: number
    availableSpots?: number
    isFull?: boolean
    minAge?: number
    maxAge?: number
    status?: string
    danceStyle: {
      id?: string
      name?: string
      color?: string
    }
    level: {
      id?: string
      name?: string
    }
    teacher?: {
      id: string
      firstName: string
      lastName: string
      fullName: string
      email?: string
    }
    schedule: Array<{
      id: string
      dayOfWeek: number
      startTime: string
      endTime: string
      room?: {
        id: string
        name: string
      }
    }>
  }
  processedBy?: {
    id: string
    firstName: string
    lastName: string
    fullName: string
    role: string
  }
}

export interface EnrollmentHistoryItem {
  id: string
  enrollmentId?: string
  enrollmentRequestId?: string
  action: string
  previousStatus?: string
  newStatus?: string
  performedByRole: string
  notes?: string
  metadata?: any
  createdAt: string
  class: {
    id?: string
    name?: string
    danceStyle?: string
    danceStyleColor?: string
    level?: string
    teacher?: {
      firstName: string
      lastName: string
      fullName: string
    }
  }
  performedBy?: {
    firstName: string
    lastName: string
    fullName: string
    role: string
  }
}

export interface ClassListItem {
  id: string
  name: string
  description?: string
  duration?: number
  maxStudents?: number
  minAge?: number
  maxAge?: number
  currentEnrollments?: number
  availableSpots?: number
  isFull?: boolean
  danceStyle?: {
    id: string
    name: string
    color?: string
  }
  level?: {
    id: string
    name: string
  }
  teacher?: {
    id: string
    firstName: string
    lastName: string
    fullName: string
  }
  schedule?: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    room?: string
  }>
}

export function useEnrollmentService() {
  const toast = useToast()

  /**
   * Parent: Create a new enrollment request
   */
  const createEnrollmentRequest = async (params: {
    student_id: string
    class_instance_id: string
    notes?: string
  }) => {
    try {
      const { data, error } = await useFetch('/api/parent/enrollment-requests', {
        method: 'POST',
        body: params,
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to create enrollment request')
      }

      return data.value
    } catch (error: any) {
      console.error('Error creating enrollment request:', error)
      toast.add({
        severity: 'error',
        summary: 'Enrollment Request Failed',
        detail: error.message || 'Failed to create enrollment request',
        life: 5000,
      })
      throw error
    }
  }

  /**
   * Parent: Get all enrollment requests for guardian's students
   */
  const getEnrollmentRequests = async (): Promise<{
    enrollmentRequests: EnrollmentRequest[]
    total: number
  }> => {
    try {
      const { data, error } = await useFetch('/api/parent/enrollment-requests', {
        method: 'GET',
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to fetch enrollment requests')
      }

      return data.value as any
    } catch (error: any) {
      console.error('Error fetching enrollment requests:', error)
      toast.add({
        severity: 'error',
        summary: 'Fetch Failed',
        detail: error.message || 'Failed to fetch enrollment requests',
        life: 5000,
      })
      throw error
    }
  }

  /**
   * Parent: Cancel a pending enrollment request
   */
  const cancelEnrollmentRequest = async (requestId: string) => {
    try {
      const { data, error } = await useFetch(`/api/parent/enrollment-requests/${requestId}`, {
        method: 'PATCH',
        body: { action: 'cancel' },
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to cancel enrollment request')
      }

      toast.add({
        severity: 'success',
        summary: 'Request Cancelled',
        detail: 'Enrollment request cancelled successfully',
        life: 3000,
      })

      return data.value
    } catch (error: any) {
      console.error('Error cancelling enrollment request:', error)
      toast.add({
        severity: 'error',
        summary: 'Cancel Failed',
        detail: error.message || 'Failed to cancel enrollment request',
        life: 5000,
      })
      throw error
    }
  }

  /**
   * Staff: Get all enrollment requests (with optional filters)
   */
  const getStaffEnrollmentRequests = async (filters?: {
    status?: string
    class_instance_id?: string
  }): Promise<{
    enrollmentRequests: EnrollmentRequest[]
    summary: {
      total: number
      pending: number
      approved: number
      denied: number
      waitlist: number
      cancelled: number
    }
  }> => {
    try {
      const query = new URLSearchParams()
      if (filters?.status) query.append('status', filters.status)
      if (filters?.class_instance_id) query.append('class_instance_id', filters.class_instance_id)

      const { data, error } = await useFetch(
        `/api/staff/enrollment-requests${query.toString() ? '?' + query.toString() : ''}`,
        {
          method: 'GET',
        }
      )

      if (error.value) {
        throw new Error(error.value.message || 'Failed to fetch enrollment requests')
      }

      return data.value as any
    } catch (error: any) {
      console.error('Error fetching enrollment requests:', error)
      toast.add({
        severity: 'error',
        summary: 'Fetch Failed',
        detail: error.message || 'Failed to fetch enrollment requests',
        life: 5000,
      })
      throw error
    }
  }

  /**
   * Staff: Approve an enrollment request
   */
  const approveEnrollmentRequest = async (requestId: string, adminNotes?: string) => {
    try {
      const { data, error } = await useFetch(`/api/staff/enrollment-requests/${requestId}`, {
        method: 'PATCH',
        body: {
          action: 'approve',
          admin_notes: adminNotes,
        },
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to approve enrollment request')
      }

      toast.add({
        severity: 'success',
        summary: 'Request Approved',
        detail: 'Enrollment request approved successfully',
        life: 3000,
      })

      return data.value
    } catch (error: any) {
      console.error('Error approving enrollment request:', error)
      toast.add({
        severity: 'error',
        summary: 'Approval Failed',
        detail: error.message || 'Failed to approve enrollment request',
        life: 5000,
      })
      throw error
    }
  }

  /**
   * Staff: Deny an enrollment request
   */
  const denyEnrollmentRequest = async (
    requestId: string,
    denialReason: string,
    adminNotes?: string
  ) => {
    try {
      const { data, error } = await useFetch(`/api/staff/enrollment-requests/${requestId}`, {
        method: 'PATCH',
        body: {
          action: 'deny',
          denial_reason: denialReason,
          admin_notes: adminNotes,
        },
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to deny enrollment request')
      }

      toast.add({
        severity: 'success',
        summary: 'Request Denied',
        detail: 'Enrollment request denied',
        life: 3000,
      })

      return data.value
    } catch (error: any) {
      console.error('Error denying enrollment request:', error)
      toast.add({
        severity: 'error',
        summary: 'Denial Failed',
        detail: error.message || 'Failed to deny enrollment request',
        life: 5000,
      })
      throw error
    }
  }

  /**
   * Parent: Get enrollment history for a student
   */
  const getEnrollmentHistory = async (
    studentId: string
  ): Promise<{
    enrollmentHistory: EnrollmentHistoryItem[]
    total: number
  }> => {
    try {
      const { data, error } = await useFetch(`/api/parent/enrollment-history/${studentId}`, {
        method: 'GET',
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to fetch enrollment history')
      }

      return data.value as any
    } catch (error: any) {
      console.error('Error fetching enrollment history:', error)
      toast.add({
        severity: 'error',
        summary: 'Fetch Failed',
        detail: error.message || 'Failed to fetch enrollment history',
        life: 5000,
      })
      throw error
    }
  }

  /**
   * Get available classes for browsing (uses existing marketing API)
   */
  const getAvailableClasses = async (filters?: {
    dance_style_id?: string
    class_level_id?: string
    day_of_week?: number
    teacher_id?: string
  }): Promise<ClassListItem[]> => {
    try {
      const query = new URLSearchParams()
      if (filters?.dance_style_id) query.append('dance_style_id', filters.dance_style_id)
      if (filters?.class_level_id) query.append('class_level_id', filters.class_level_id)
      if (filters?.day_of_week !== undefined) query.append('day_of_week', filters.day_of_week.toString())
      if (filters?.teacher_id) query.append('teacher_id', filters.teacher_id)

      const { data, error } = await useFetch(
        `/api/marketing/classes${query.toString() ? '?' + query.toString() : ''}`,
        {
          method: 'GET',
        }
      )

      if (error.value) {
        throw new Error(error.value.message || 'Failed to fetch available classes')
      }

      return (data.value as any)?.classes || []
    } catch (error: any) {
      console.error('Error fetching available classes:', error)
      toast.add({
        severity: 'error',
        summary: 'Fetch Failed',
        detail: error.message || 'Failed to fetch available classes',
        life: 5000,
      })
      throw error
    }
  }

  /**
   * Helper: Format status for display
   */
  const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      approved: 'Approved',
      denied: 'Denied',
      waitlist: 'Waitlist',
      cancelled: 'Cancelled',
      active: 'Active',
      dropped: 'Dropped',
    }
    return statusMap[status] || status
  }

  /**
   * Helper: Get status severity for UI
   */
  const getStatusSeverity = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' => {
    const severityMap: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'secondary'> = {
      pending: 'warning',
      approved: 'success',
      denied: 'danger',
      waitlist: 'info',
      cancelled: 'secondary',
      active: 'success',
      dropped: 'secondary',
    }
    return severityMap[status] || 'info'
  }

  /**
   * Helper: Format day of week
   */
  const formatDayOfWeek = (dayOfWeek: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayOfWeek] || `Day ${dayOfWeek}`
  }

  /**
   * Helper: Format time
   */
  const formatTime = (timeString: string): string => {
    if (!timeString) return ''
    try {
      const date = new Date(`2000-01-01T${timeString}`)
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch (e) {
      return timeString
    }
  }

  return {
    // Core operations
    createEnrollmentRequest,
    getEnrollmentRequests,
    cancelEnrollmentRequest,
    getStaffEnrollmentRequests,
    approveEnrollmentRequest,
    denyEnrollmentRequest,
    getEnrollmentHistory,
    getAvailableClasses,

    // Helpers
    formatStatus,
    getStatusSeverity,
    formatDayOfWeek,
    formatTime,
  }
}
