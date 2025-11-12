/**
 * Pinia store for Lesson Planning state management
 */
import { defineStore } from 'pinia'
import type {
  LessonPlan,
  LearningObjective,
  LessonPlanTemplate,
  LessonPlanStatus
} from '~/types/lesson-planning'

interface LessonPlanState {
  lessonPlans: LessonPlan[]
  currentLessonPlan: LessonPlan | null
  learningObjectives: LearningObjective[]
  templates: LessonPlanTemplate[]
  loading: {
    lessonPlans: boolean
    objectives: boolean
    templates: boolean
    saving: boolean
  }
  filters: {
    classInstanceId?: string
    teacherId?: string
    status?: LessonPlanStatus
    isArchived: boolean
    dateFrom?: string
    dateTo?: string
  }
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

export const useLessonPlanStore = defineStore('lessonPlan', {
  state: (): LessonPlanState => ({
    lessonPlans: [],
    currentLessonPlan: null,
    learningObjectives: [],
    templates: [],
    loading: {
      lessonPlans: false,
      objectives: false,
      templates: false,
      saving: false
    },
    filters: {
      isArchived: false
    },
    pagination: {
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 0
    }
  }),

  getters: {
    /**
     * Get lesson plans by status
     */
    getLessonPlansByStatus: (state) => (status: LessonPlanStatus) => {
      return state.lessonPlans.filter(plan => plan.status === status)
    },

    /**
     * Get active (non-archived) lesson plans
     */
    activeLessonPlans: (state) => {
      return state.lessonPlans.filter(plan => !plan.is_archived)
    },

    /**
     * Get archived lesson plans
     */
    archivedLessonPlans: (state) => {
      return state.lessonPlans.filter(plan => plan.is_archived)
    },

    /**
     * Get lesson plans for a specific class instance
     */
    getLessonPlansForClass: (state) => (classInstanceId: string) => {
      return state.lessonPlans.filter(plan => plan.class_instance_id === classInstanceId)
    },

    /**
     * Get active learning objectives
     */
    activeLearningObjectives: (state) => {
      return state.learningObjectives.filter(obj => obj.is_active)
    },

    /**
     * Get public templates
     */
    publicTemplates: (state) => {
      return state.templates.filter(template => template.is_public)
    },

    /**
     * Get templates by teacher
     */
    getTemplatesByTeacher: (state) => (teacherId: string) => {
      return state.templates.filter(template => template.teacher_id === teacherId)
    }
  },

  actions: {
    /**
     * Fetch lesson plans with filters
     */
    async fetchLessonPlans(params = {}) {
      this.loading.lessonPlans = true
      try {
        const service = useLessonPlanningService()
        const { data, error } = await service.fetchLessonPlans({
          ...this.filters,
          ...params,
          page: this.pagination.page,
          limit: this.pagination.limit
        })

        if (error.value) {
          throw error.value
        }

        if (data.value) {
          this.lessonPlans = (data.value as any).lesson_plans || []
          this.pagination = (data.value as any).pagination || this.pagination
        }
      } catch (error) {
        console.error('Failed to fetch lesson plans:', error)
        throw error
      } finally {
        this.loading.lessonPlans = false
      }
    },

    /**
     * Fetch a single lesson plan by ID
     */
    async fetchLessonPlan(id: string) {
      this.loading.lessonPlans = true
      try {
        const service = useLessonPlanningService()
        const { data, error } = await service.fetchLessonPlan(id)

        if (error.value) {
          throw error.value
        }

        if (data.value) {
          this.currentLessonPlan = (data.value as any).lesson_plan
        }

        return this.currentLessonPlan
      } catch (error) {
        console.error('Failed to fetch lesson plan:', error)
        throw error
      } finally {
        this.loading.lessonPlans = false
      }
    },

    /**
     * Create a new lesson plan
     */
    async createLessonPlan(lessonPlanData: any) {
      this.loading.saving = true
      try {
        const service = useLessonPlanningService()
        const { data, error } = await service.createLessonPlan(lessonPlanData)

        if (error.value) {
          throw error.value
        }

        if (data.value) {
          const newPlan = (data.value as any).lesson_plan
          this.lessonPlans.unshift(newPlan)
          this.currentLessonPlan = newPlan
          return newPlan
        }
      } catch (error) {
        console.error('Failed to create lesson plan:', error)
        throw error
      } finally {
        this.loading.saving = false
      }
    },

    /**
     * Update a lesson plan
     */
    async updateLessonPlan(id: string, updates: any) {
      this.loading.saving = true
      try {
        const service = useLessonPlanningService()
        const { data, error } = await service.updateLessonPlan(id, { id, ...updates })

        if (error.value) {
          throw error.value
        }

        if (data.value) {
          const updatedPlan = (data.value as any).lesson_plan
          const index = this.lessonPlans.findIndex(plan => plan.id === id)
          if (index !== -1) {
            this.lessonPlans[index] = updatedPlan
          }
          if (this.currentLessonPlan?.id === id) {
            this.currentLessonPlan = updatedPlan
          }
          return updatedPlan
        }
      } catch (error) {
        console.error('Failed to update lesson plan:', error)
        throw error
      } finally {
        this.loading.saving = false
      }
    },

    /**
     * Delete a lesson plan
     */
    async deleteLessonPlan(id: string) {
      try {
        const service = useLessonPlanningService()
        const { error } = await service.deleteLessonPlan(id)

        if (error.value) {
          throw error.value
        }

        this.lessonPlans = this.lessonPlans.filter(plan => plan.id !== id)
        if (this.currentLessonPlan?.id === id) {
          this.currentLessonPlan = null
        }
      } catch (error) {
        console.error('Failed to delete lesson plan:', error)
        throw error
      }
    },

    /**
     * Fetch learning objectives
     */
    async fetchLearningObjectives(params = {}) {
      this.loading.objectives = true
      try {
        const service = useLessonPlanningService()
        const { data, error } = await service.fetchLearningObjectives(params)

        if (error.value) {
          throw error.value
        }

        if (data.value) {
          this.learningObjectives = (data.value as any).objectives || []
        }
      } catch (error) {
        console.error('Failed to fetch learning objectives:', error)
        throw error
      } finally {
        this.loading.objectives = false
      }
    },

    /**
     * Fetch lesson plan templates
     */
    async fetchTemplates(params = {}) {
      this.loading.templates = true
      try {
        const service = useLessonPlanningService()
        const { data, error } = await service.fetchLessonPlanTemplates(params)

        if (error.value) {
          throw error.value
        }

        if (data.value) {
          this.templates = (data.value as any).templates || []
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error)
        throw error
      } finally {
        this.loading.templates = false
      }
    },

    /**
     * Set filters
     */
    setFilters(filters: any) {
      this.filters = { ...this.filters, ...filters }
    },

    /**
     * Set pagination
     */
    setPagination(page: number, limit?: number) {
      this.pagination.page = page
      if (limit) {
        this.pagination.limit = limit
      }
    },

    /**
     * Reset filters
     */
    resetFilters() {
      this.filters = {
        isArchived: false
      }
      this.pagination.page = 1
    },

    /**
     * Clear current lesson plan
     */
    clearCurrentLessonPlan() {
      this.currentLessonPlan = null
    }
  }
})
