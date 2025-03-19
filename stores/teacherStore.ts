import { defineStore } from 'pinia'
import type { Teacher } from '~/types'

export const useTeacherStore = defineStore('teacher', {
  state: () => ({
    teachers: [] as Teacher[],
    currentTeacher: null as Teacher | null,
    loading: false,
    error: null as string | null,
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 0
    }
  }),
  
  getters: {
    activeTeachers: (state) => state.teachers.filter(teacher => teacher.status === 'active'),
    getTeacherById: (state) => (id: string) => state.teachers.find(teacher => teacher.id === id),
    getTeacherName: () => (teacher: Teacher) => `${teacher.first_name} ${teacher.last_name}`
  },
  
  actions: {
    async fetchTeachers(params = {}) {
      const { fetchTeachers } = useApiService()
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await fetchTeachers({
          page: this.pagination.page,
          limit: this.pagination.limit,
          ...params
        })
        
        if (error.value) throw new Error(error.value.statusMessage)
        
        this.teachers = data.value.teachers
        this.pagination = data.value.pagination
        return this.teachers
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch teachers'
        console.error('Error fetching teachers:', error)
        return []
      } finally {
        this.loading = false
      }
    },
    
    async fetchTeacherById(id: string) {
      const { fetchTeacher } = useApiService()
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await fetchTeacher(id)
        
        if (error.value) throw new Error(error.value.statusMessage)
        
        this.currentTeacher = data.value
        return this.currentTeacher
      } catch (error: any) {
        this.error = error.message || `Failed to fetch teacher with ID: ${id}`
        console.error(`Error fetching teacher ${id}:`, error)
        return null
      } finally {
        this.loading = false
      }
    },
    
    async createTeacher(teacherData: Partial<Teacher>) {
      const { createTeacher } = useApiService()
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await createTeacher(teacherData)
        
        if (error.value) throw new Error(error.value.statusMessage)
        
        // Refresh the teacher list
        await this.fetchTeachers()
        
        return data.value.teacher
      } catch (error: any) {
        this.error = error.message || 'Failed to create teacher'
        console.error('Error creating teacher:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async updateTeacher(id: string, teacherData: Partial<Teacher>) {
      const { updateTeacher } = useApiService()
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await updateTeacher(id, teacherData)
        
        if (error.value) throw new Error(error.value.statusMessage)
        
        // Update local state
        const index = this.teachers.findIndex(t => t.id === id)
        if (index !== -1) {
          this.teachers[index] = data.value.teacher
        }
        
        if (this.currentTeacher?.id === id) {
          this.currentTeacher = data.value.teacher
        }
        
        return data.value.teacher
      } catch (error: any) {
        this.error = error.message || `Failed to update teacher with ID: ${id}`
        console.error(`Error updating teacher ${id}:`, error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async deleteTeacher(id: string) {
      const { deleteTeacher } = useApiService()
      this.loading = true
      this.error = null
      
      try {
        const { error } = await deleteTeacher(id)
        
        if (error.value) throw new Error(error.value.statusMessage)
        
        // Update local state
        this.teachers = this.teachers.filter(t => t.id !== id)
        
        if (this.currentTeacher?.id === id) {
          this.currentTeacher = null
        }
        
        return true
      } catch (error: any) {
        this.error = error.message || `Failed to delete teacher with ID: ${id}`
        console.error(`Error deleting teacher ${id}:`, error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})