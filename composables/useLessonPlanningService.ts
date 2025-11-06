/**
 * Composable service for Lesson Planning operations
 * Provides methods for lesson plans, templates, objectives, and progress tracking
 */
import type {
  LessonPlanFilters,
  LearningObjectiveFilters,
  LessonPlanTemplateFilters,
  CreateLessonPlanInput,
  UpdateLessonPlanInput,
  CreateLearningObjectiveInput,
  UpdateLearningObjectiveInput,
  CreateLessonPlanTemplateInput,
  UpdateLessonPlanTemplateInput,
  CreateLessonPlanShareInput,
  CreateStudentObjectiveProgressInput,
  UpdateStudentObjectiveProgressInput
} from '~/types/lesson-planning'

export function useLessonPlanningService() {
  // ============================================
  // Lesson Plans
  // ============================================

  const fetchLessonPlans = async (params: LessonPlanFilters = {}) => {
    return await useFetch('/api/lesson-plans', {
      method: 'GET',
      params
    })
  }

  const fetchLessonPlan = async (id: string) => {
    return await useFetch(`/api/lesson-plans/${id}`, {
      method: 'GET'
    })
  }

  const createLessonPlan = async (data: CreateLessonPlanInput) => {
    return await useFetch('/api/lesson-plans/add', {
      method: 'POST',
      body: data
    })
  }

  const updateLessonPlan = async (id: string, data: UpdateLessonPlanInput) => {
    return await useFetch(`/api/lesson-plans/${id}`, {
      method: 'PUT',
      body: data
    })
  }

  const deleteLessonPlan = async (id: string) => {
    return await useFetch(`/api/lesson-plans/${id}`, {
      method: 'DELETE'
    })
  }

  // ============================================
  // Learning Objectives
  // ============================================

  const fetchLearningObjectives = async (params: LearningObjectiveFilters = {}) => {
    return await useFetch('/api/learning-objectives', {
      method: 'GET',
      params
    })
  }

  const createLearningObjective = async (data: CreateLearningObjectiveInput) => {
    return await useFetch('/api/learning-objectives/add', {
      method: 'POST',
      body: data
    })
  }

  const updateLearningObjective = async (id: string, data: UpdateLearningObjectiveInput) => {
    return await useFetch(`/api/learning-objectives/${id}`, {
      method: 'PUT',
      body: data
    })
  }

  const deleteLearningObjective = async (id: string) => {
    return await useFetch(`/api/learning-objectives/${id}`, {
      method: 'DELETE'
    })
  }

  // ============================================
  // Lesson Plan Templates
  // ============================================

  const fetchLessonPlanTemplates = async (params: LessonPlanTemplateFilters = {}) => {
    return await useFetch('/api/lesson-plan-templates', {
      method: 'GET',
      params
    })
  }

  const createLessonPlanTemplate = async (data: CreateLessonPlanTemplateInput) => {
    return await useFetch('/api/lesson-plan-templates/add', {
      method: 'POST',
      body: data
    })
  }

  const updateLessonPlanTemplate = async (id: string, data: UpdateLessonPlanTemplateInput) => {
    return await useFetch(`/api/lesson-plan-templates/${id}`, {
      method: 'PUT',
      body: data
    })
  }

  const deleteLessonPlanTemplate = async (id: string) => {
    return await useFetch(`/api/lesson-plan-templates/${id}`, {
      method: 'DELETE'
    })
  }

  // ============================================
  // Lesson Plan Sharing
  // ============================================

  const shareLessonPlan = async (data: CreateLessonPlanShareInput) => {
    return await useFetch('/api/lesson-plan-shares/add', {
      method: 'POST',
      body: data
    })
  }

  // ============================================
  // Student Progress Tracking
  // ============================================

  const updateStudentProgress = async (data: CreateStudentObjectiveProgressInput | UpdateStudentObjectiveProgressInput) => {
    return await useFetch('/api/student-progress/update', {
      method: 'POST',
      body: data
    })
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Create a lesson plan from a template
   */
  const createLessonFromTemplate = async (
    templateId: string,
    classInstanceId: string,
    teacherId: string,
    lessonDate: string
  ) => {
    // First fetch the template
    const { data: template } = await useFetch(`/api/lesson-plan-templates/${templateId}`)

    if (!template.value) {
      throw new Error('Template not found')
    }

    // Create lesson plan from template
    const lessonData: CreateLessonPlanInput = {
      class_instance_id: classInstanceId,
      teacher_id: teacherId,
      template_id: templateId,
      lesson_date: lessonDate,
      title: (template.value as any).template.name,
      description: (template.value as any).template.description,
      duration: (template.value as any).template.duration,
      content: (template.value as any).template.content,
      objectives: (template.value as any).template.objectives,
      materials_needed: (template.value as any).template.materials_needed,
      warm_up: (template.value as any).template.warm_up,
      main_activity: (template.value as any).template.main_activity,
      cool_down: (template.value as any).template.cool_down,
      notes: (template.value as any).template.notes,
      status: 'draft'
    }

    return await createLessonPlan(lessonData)
  }

  /**
   * Archive a lesson plan
   */
  const archiveLessonPlan = async (id: string) => {
    return await updateLessonPlan(id, { id, is_archived: true })
  }

  /**
   * Restore an archived lesson plan
   */
  const restoreLessonPlan = async (id: string) => {
    return await updateLessonPlan(id, { id, is_archived: false })
  }

  /**
   * Mark lesson plan as completed
   */
  const completeLessonPlan = async (id: string) => {
    return await updateLessonPlan(id, {
      id,
      status: 'completed',
      completed_at: new Date().toISOString()
    })
  }

  return {
    // Lesson Plans
    fetchLessonPlans,
    fetchLessonPlan,
    createLessonPlan,
    updateLessonPlan,
    deleteLessonPlan,
    archiveLessonPlan,
    restoreLessonPlan,
    completeLessonPlan,
    createLessonFromTemplate,

    // Learning Objectives
    fetchLearningObjectives,
    createLearningObjective,
    updateLearningObjective,
    deleteLearningObjective,

    // Templates
    fetchLessonPlanTemplates,
    createLessonPlanTemplate,
    updateLessonPlanTemplate,
    deleteLessonPlanTemplate,

    // Sharing
    shareLessonPlan,

    // Progress Tracking
    updateStudentProgress
  }
}
