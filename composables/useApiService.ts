// composables/useApiService.ts
export function useApiService() {
  const fetchDashboard = async () => {
    return await useFetch('/api/dashboard')
  }
  
  const fetchClasses = async (params = {}) => {
    return await useFetch('/api/classes', { params })
  }
  
  const fetchClass = async (id) => {
    return await useFetch(`/api/classes/${id}`)
  }
  
  const createClass = async (classData) => {
    return await useFetch('/api/classes/add', {
      method: 'POST',
      body: classData
    })
  }
  
  const updateClass = async (id, classData) => {
    return await useFetch(`/api/classes/${id}`, {
      method: 'PUT',
      body: classData
    })
  }
  
  const deleteClass = async (id) => {
    return await useFetch(`/api/classes/${id}`, {
      method: 'DELETE'
    })
  }
  
  const fetchStudents = async (params = {}) => {
    return await useFetch('/api/students', { params })
  }
  
  const fetchSchedule = async (params = {}) => {
    return await useFetch('/api/schedules', { params })
  }
  
  return {
    fetchDashboard,
    fetchClasses,
    fetchClass,
    createClass,
    updateClass,
    deleteClass,
    fetchStudents,
    fetchSchedule
  }
}