import { defineStore } from 'pinia'
import type { TeacherAvailability, TeacherAvailabilityException } from '~/types'

export const useTeacherAvailabilityStore = defineStore('teacherAvailability', {
  state: () => ({
    regularAvailability: [] as TeacherAvailability[],
    exceptions: [] as TeacherAvailabilityException[],
    loading: false,
    error: null as string | null,
    currentTeacherId: null as string | null
  }),
  
  getters: {
    getAvailabilityByDay: (state) => (day: number) => {
      return state.regularAvailability.filter(a => a.day_of_week === day)
    },
    
    getExceptionsForDate: (state) => (date: string) => {
      return state.exceptions.filter(e => e.exception_date === date)
    },
    
    // Check if a teacher is available at a specific time
    isAvailableAt: (state) => (date: Date) => {
      const dayOfWeek = date.getDay()
      const timeString = date.toTimeString().slice(0, 8) // HH:MM:SS
      const dateString = date.toISOString().slice(0, 10) // YYYY-MM-DD
      
      // Check for exceptions first
      const dayExceptions = state.exceptions.filter(e => e.exception_date === dateString)
      
      if (dayExceptions.length > 0) {
        for (const exception of dayExceptions) {
          // If it's a full day exception
          if (!exception.start_time || !exception.end_time) {
            return exception.is_available
          }
          
          // If it's a time-specific exception
          if (timeString >= exception.start_time && timeString <= exception.end_time) {
            return exception.is_available
          }
        }
      }
      
      // Check regular availability
      const dayAvailability = state.regularAvailability.filter(a => a.day_of_week === dayOfWeek)
      
      for (const avail of dayAvailability) {
        if (timeString >= avail.start_time && timeString <= avail.end_time) {
          return avail.is_available
        }
      }
      
      // Default to not available if no matching time slots
      return false
    }
  },
  
  actions: {
    async fetchTeacherAvailability(teacherId: string, params = {}) {
      const { fetchTeacherAvailability } = useApiService()
      this.loading = true
      this.error = null
      this.currentTeacherId = teacherId
      
      try {
        const { data, error } = await fetchTeacherAvailability(teacherId, params)
        
        if (error.value) throw new Error(error.value.statusMessage)
        
        this.regularAvailability = data.value.regularAvailability
        this.exceptions = data.value.exceptions
        
        return {
          regularAvailability: this.regularAvailability,
          exceptions: this.exceptions
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch teacher availability'
        console.error('Error fetching teacher availability:', error)
        return { regularAvailability: [], exceptions: [] }
      } finally {
        this.loading = false
      }
    },
    
    async createAvailability(availabilityData: Partial<TeacherAvailability>) {
      if (!this.currentTeacherId) throw new Error('No teacher selected')
      
      const { createTeacherAvailability } = useApiService()
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await createTeacherAvailability(
          this.currentTeacherId,
          availabilityData
        )
        
        if (error.value) throw new Error(error.value.statusMessage)
        
        // Refresh availability data
        await this.fetchTeacherAvailability(this.currentTeacherId)
        
        return data.value.availability
      } catch (error: any) {
        this.error = error.message || 'Failed to create availability'
        console.error('Error creating availability:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async updateAvailability(id: string, availabilityData: Partial<TeacherAvailability>) {
      if (!this.currentTeacherId) throw new Error('No teacher selected')
      
      const { updateTeacherAvailability } = useApiService()
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await updateTeacherAvailability(
          this.currentTeacherId,
          {...availabilityData, id}
        )
        
        if (error.value) throw new Error(error.value.statusMessage)
        
        // Update local state
        const index = this.regularAvailability.findIndex(a => a.id === id)
        if (index !== -1) {
          this.regularAvailability[index] = data.value.availability
        }
        
        return data.value.availability
      } catch (error: any) {
        this.error = error.message || 'Failed to update availability'
        console.error('Error updating availability:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async deleteAvailability(id: string) {
      if (!this.currentTeacherId) throw new Error('No teacher selected')
      
      const { deleteTeacherAvailability } = useApiService()
      this.loading = true
      this.error = null
      
      try {
        const { error } = await deleteTeacherAvailability(this.currentTeacherId, id)
        
        if (error.value) throw new Error(error.value.statusMessage)
        
        // Update local state
        this.regularAvailability = this.regularAvailability.filter(a => a.id !== id)
        
        return true
      } catch (error: any) {
        this.error = error.message || 'Failed to delete availability'
        console.error('Error deleting availability:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async createException(exceptionData: Partial<TeacherAvailabilityException>) {
      if (!this.currentTeacherId) throw new Error('No teacher selected')
      
      const { createTeacherException } = useApiService()
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await createTeacherException(
          this.currentTeacherId,
          exceptionData
        )
        
        if (error.value) throw new Error(error.value.statusMessage)
        
        // Add to local state
        this.exceptions.push(data.value.exception)
        
        return data.value.exception
      } catch (error: any) {
        this.error = error.message || 'Failed to create exception'
        console.error('Error creating exception:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async updateException(id: string, exceptionData: Partial<TeacherAvailabilityException>) {
      if (!this.currentTeacherId) throw new Error('No teacher selected')
      
      const { updateTeacherException } = useApiService()
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await updateTeacherException(
          this.currentTeacherId,
          id,
          exceptionData
        )
        
        if (error.value) throw new Error(error.value.statusMessage)
        
        // Update local state
        const index = this.exceptions.findIndex(e => e.id === id)
        if (index !== -1) {
          this.exceptions[index] = data.value.exception
        }
        
        return data.value.exception
      } catch (error: any) {
        this.error = error.message || 'Failed to update exception'
        console.error('Error updating exception:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async deleteException(id: string) {
      if (!this.currentTeacherId) throw new Error('No teacher selected')
      
      const { deleteTeacherException } = useApiService()
      this.loading = true
      this.error = null
      
      try {
        const { error } = await deleteTeacherException(this.currentTeacherId, id)
        
        if (error.value) throw new Error(error.value.statusMessage)
        
        // Update local state
        this.exceptions = this.exceptions.filter(e => e.id !== id)
        
        return true
      } catch (error: any) {
        this.error = error.message || 'Failed to delete exception'
        console.error('Error deleting exception:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})