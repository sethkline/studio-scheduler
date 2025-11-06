import type { AddStudentForm, StudentProfile, StudentWithGuardians } from '~/types/parents'

/**
 * Composable for parent student management
 * Provides methods to interact with student API endpoints
 */
export function useParentStudentService() {
  /**
   * Fetch all students for the logged-in parent
   * @returns {Promise<StudentProfile[]>} List of students
   */
  const fetchStudents = async () => {
    return await useFetch<StudentProfile[]>('/api/parent/students', {
      method: 'GET',
    })
  }

  /**
   * Fetch a single student with full details
   * @param {string} studentId - Student ID
   * @returns {Promise<StudentWithGuardians>} Student with guardians and enrollments
   */
  const fetchStudent = async (studentId: string) => {
    return await useFetch<StudentWithGuardians>(`/api/parent/students/${studentId}`, {
      method: 'GET',
    })
  }

  /**
   * Create a new student
   * @param {AddStudentForm} studentData - Student form data
   * @returns {Promise<object>} Created student with relationship
   */
  const createStudent = async (studentData: AddStudentForm) => {
    return await useFetch('/api/parent/students', {
      method: 'POST',
      body: studentData,
    })
  }

  /**
   * Update an existing student
   * @param {string} studentId - Student ID
   * @param {Partial<AddStudentForm>} studentData - Updated student data
   * @returns {Promise<object>} Updated student
   */
  const updateStudent = async (studentId: string, studentData: Partial<AddStudentForm>) => {
    return await useFetch(`/api/parent/students/${studentId}`, {
      method: 'PUT',
      body: studentData,
    })
  }

  /**
   * Archive a student (soft delete)
   * @param {string} studentId - Student ID
   * @returns {Promise<object>} Response with status
   */
  const archiveStudent = async (studentId: string) => {
    return await useFetch(`/api/parent/students/${studentId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Upload student photo
   * @param {string} studentId - Student ID
   * @param {File} photoFile - Photo file to upload
   * @returns {Promise<object>} Response with photo URL
   */
  const uploadStudentPhoto = async (studentId: string, photoFile: File) => {
    const formData = new FormData()
    formData.append('photo', photoFile)

    return await useFetch(`/api/parent/students/${studentId}/photo`, {
      method: 'PUT',
      body: formData,
    })
  }

  /**
   * Remove student photo
   * @param {string} studentId - Student ID
   * @returns {Promise<object>} Response with status
   */
  const removeStudentPhoto = async (studentId: string) => {
    return await useFetch(`/api/parent/students/${studentId}/photo`, {
      method: 'DELETE',
    })
  }

  return {
    fetchStudents,
    fetchStudent,
    createStudent,
    updateStudent,
    archiveStudent,
    uploadStudentPhoto,
    removeStudentPhoto,
  }
}
