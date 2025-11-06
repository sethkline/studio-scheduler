/**
 * Composable for evaluation API operations
 */

import type {
  CreateEvaluationRequest,
  UpdateEvaluationRequest,
  EvaluationWithSkills,
  EvaluationFilters,
  PaginationParams,
  PaginationResult
} from '~/types/assessment'

export function useEvaluationService() {
  /**
   * Fetch evaluations with filtering and pagination
   */
  const fetchEvaluations = async (
    filters?: EvaluationFilters,
    pagination?: PaginationParams
  ) => {
    const params = {
      ...filters,
      ...pagination
    }

    return await useFetch<{
      evaluations: EvaluationWithSkills[]
      pagination: PaginationResult<EvaluationWithSkills>['pagination']
    }>('/api/evaluations', {
      params,
      headers: useRequestHeaders(['cookie'])
    })
  }

  /**
   * Fetch a single evaluation by ID
   */
  const fetchEvaluationById = async (id: string) => {
    return await useFetch<{
      evaluation: EvaluationWithSkills
    }>(`/api/evaluations/${id}`, {
      headers: useRequestHeaders(['cookie'])
    })
  }

  /**
   * Create a new evaluation
   */
  const createEvaluation = async (data: CreateEvaluationRequest) => {
    return await useFetch<{
      message: string
      evaluation: EvaluationWithSkills
    }>('/api/evaluations/create', {
      method: 'POST',
      body: data,
      headers: useRequestHeaders(['cookie'])
    })
  }

  /**
   * Update an existing evaluation
   */
  const updateEvaluation = async (id: string, data: UpdateEvaluationRequest) => {
    return await useFetch<{
      message: string
      evaluation: EvaluationWithSkills
    }>(`/api/evaluations/${id}`, {
      method: 'PUT',
      body: data,
      headers: useRequestHeaders(['cookie'])
    })
  }

  /**
   * Delete an evaluation
   */
  const deleteEvaluation = async (id: string) => {
    return await useFetch<{
      message: string
    }>(`/api/evaluations/${id}`, {
      method: 'DELETE',
      headers: useRequestHeaders(['cookie'])
    })
  }

  /**
   * Get skill template for evaluation based on dance style and class level
   */
  const fetchSkillTemplate = async (danceStyleId: string, classLevelId: string) => {
    return await useFetch<{
      skills: any[]
      categories: { category: string; skills: any[] }[]
      dance_style_id: string
      class_level_id: string
    }>('/api/evaluations/skill-template', {
      params: {
        dance_style_id: danceStyleId,
        class_level_id: classLevelId
      },
      headers: useRequestHeaders(['cookie'])
    })
  }

  /**
   * Get student evaluation history for comparison
   */
  const fetchStudentHistory = async (
    studentId: string,
    classInstanceId?: string,
    limit?: number
  ) => {
    return await useFetch<{
      student_id: string
      evaluations: EvaluationWithSkills[]
      count: number
    }>('/api/evaluations/student-history', {
      params: {
        student_id: studentId,
        class_instance_id: classInstanceId,
        limit
      },
      headers: useRequestHeaders(['cookie'])
    })
  }

  /**
   * Bulk create evaluations for multiple students in a class
   */
  const bulkCreateEvaluations = async (data: {
    class_instance_id: string
    schedule_id?: string
    evaluations: Array<{
      student_id: string
      overall_rating?: number
      effort_rating?: number
      attitude_rating?: number
      strengths?: string
      areas_for_improvement?: string
      comments?: string
      recommended_next_level?: string
      status?: 'draft' | 'submitted'
      skills?: Array<{
        skill_name: string
        skill_category?: string
        rating: string
        notes?: string
      }>
    }>
  }) => {
    return await useFetch<{
      message: string
      count: number
      evaluations: EvaluationWithSkills[]
    }>('/api/evaluations/bulk-create', {
      method: 'POST',
      body: data,
      headers: useRequestHeaders(['cookie'])
    })
  }

  /**
   * Submit an evaluation (change status from draft to submitted)
   */
  const submitEvaluation = async (id: string) => {
    return await updateEvaluation(id, {
      evaluation: {
        status: 'submitted'
      }
    })
  }

  return {
    fetchEvaluations,
    fetchEvaluationById,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
    fetchSkillTemplate,
    fetchStudentHistory,
    bulkCreateEvaluations,
    submitEvaluation
  }
}
