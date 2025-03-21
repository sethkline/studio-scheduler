import { defineStore } from 'pinia'
import type { Schedule, Pagination } from '~/types'

export const useScheduleTermStore = defineStore('scheduleTerm', {
  state: () => ({
    schedules: [] as Schedule[],
    currentSchedule: null as Schedule | null,
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 0
    } as Pagination,
    loading: false,
    error: null as string | null,
    formData: {
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      is_active: false
    } as Partial<Schedule>
  }),
  
  getters: {
    activeSchedules: (state) => state.schedules.filter(s => s.is_active),
    upcomingSchedules: (state) => state.schedules.filter(s => new Date(s.start_date) > new Date())
  },
  
  actions: {
    async fetchSchedules(params = {}) {
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await useFetch('/api/schedules', { 
          params: {
            ...params,
            page: this.pagination.page,
            limit: this.pagination.limit
          }
        })
        
        if (error.value) throw new Error(error.value.message)
        
        this.schedules = data.value.schedules
        this.pagination = data.value.pagination
        
        return this.schedules
      } catch (err) {
        this.error = err.message || 'Failed to fetch schedules'
        console.error('Error fetching schedules:', err)
        return []
      } finally {
        this.loading = false
      }
    },
    
    async fetchSchedule(id) {
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await useFetch(`/api/schedules/${id}`)
        
        if (error.value) throw new Error(error.value.message)
        
        this.currentSchedule = data.value
        
        return this.currentSchedule
      } catch (err) {
        this.error = err.message || 'Failed to fetch schedule'
        console.error('Error fetching schedule:', err)
        return null
      } finally {
        this.loading = false
      }
    },
    
    async createSchedule(scheduleData) {
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await useFetch('/api/schedules/add', {
          method: 'POST',
          body: scheduleData
        })
        
        if (error.value) throw new Error(error.value.message)
        
        // Refresh schedules after creation
        await this.fetchSchedules()
        
        return data.value.schedule
      } catch (err) {
        this.error = err.message || 'Failed to create schedule'
        console.error('Error creating schedule:', err)
        throw err
      } finally {
        this.loading = false
      }
    },
    
    async updateSchedule(id, updates) {
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await useFetch(`/api/schedules/${id}`, {
          method: 'PUT',
          body: updates
        })
        
        if (error.value) throw new Error(error.value.message)
        
        // Update in local state if in the list
        const index = this.schedules.findIndex(s => s.id === id)
        if (index !== -1) {
          this.schedules[index] = { ...this.schedules[index], ...updates }
        }
        
        // If this is the current schedule, update it too
        if (this.currentSchedule && this.currentSchedule.id === id) {
          this.currentSchedule = { ...this.currentSchedule, ...updates }
        }
        
        return data.value.schedule
      } catch (err) {
        this.error = err.message || 'Failed to update schedule'
        console.error('Error updating schedule:', err)
        throw err
      } finally {
        this.loading = false
      }
    },
    
    async duplicateSchedule(duplicateData) {
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await useFetch('/api/schedules/duplicate', {
          method: 'POST',
          body: duplicateData
        })
        
        if (error.value) throw new Error(error.value.message)
        
        // Refresh schedules after duplication
        await this.fetchSchedules()
        
        return data.value.schedule
      } catch (err) {
        this.error = err.message || 'Failed to duplicate schedule'
        console.error('Error duplicating schedule:', err)
        throw err
      } finally {
        this.loading = false
      }
    },
    
    async setActiveSchedule(id) {
      // First, deactivate all schedules
      for (const schedule of this.schedules.filter(s => s.is_active)) {
        await this.updateSchedule(schedule.id, { is_active: false })
      }
      
      // Then activate the selected one
      return await this.updateSchedule(id, { is_active: true })
    },
    
    resetForm() {
      this.formData = {
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        is_active: false
      }
    },
    
    setFormData(data) {
      this.formData = { ...data }
    }
  }
})