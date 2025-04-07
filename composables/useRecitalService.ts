import type { Recital } from '~/types/recitals'

export function useRecitalService() {
  /**
   * Fetch all recitals with program status
   */
  const fetchRecitals = async (params = {}) => {
    return await useFetch('/api/recitals', { 
      params,
      // Ensure fresh data on each call
      key: `recitals-${new Date().getTime()}`
    })
  }
  
  /**
   * Fetch a single recital by ID
   */
  const fetchRecital = async (id: string) => {
    return await useFetch(`/api/recitals/${id}`)
  }
  
  /**
   * Create a new recital
   */
  const createRecital = async (recitalData: Partial<Recital>) => {
    return await useFetch('/api/recitals', {
      method: 'POST',
      body: recitalData
    })
  }
  
  /**
   * Update an existing recital
   */
  const updateRecital = async (id: string, recitalData: Partial<Recital>) => {
    return await useFetch(`/api/recitals/${id}`, {
      method: 'PUT',
      body: recitalData
    })
  }
  
  /**
   * Delete a recital
   */
  const deleteRecital = async (id: string) => {
    return await useFetch(`/api/recitals/${id}`, {
      method: 'DELETE'
    })
  }
  
  /**
   * Fetch recital program
   */
  const fetchRecitalProgram = async (recitalId: string) => {
    return await useFetch(`/api/recitals/${recitalId}/program`)
  }
  
  /**
   * Create or update recital program
   */
  const saveRecitalProgram = async (recitalId: string, programData: any) => {
    return await useFetch(`/api/recitals/${recitalId}/program`, {
      method: 'POST',
      body: programData
    })
  }
  
  /**
   * Update the artistic director's note
   */
  const updateArtisticNote = async (recitalId: string, note: string) => {
    return await useFetch(`/api/recitals/${recitalId}/program/artistic-note`, {
      method: 'PUT',
      body: { note }
    })
  }
  
  /**
   * Update the acknowledgments
   */
  const updateAcknowledgments = async (recitalId: string, acknowledgments: string) => {
    return await useFetch(`/api/recitals/${recitalId}/program/acknowledgments`, {
      method: 'PUT',
      body: { acknowledgments }
    })
  }
  
  /**
   * Upload cover image for program
   */
  const uploadCoverImage = async (recitalId: string, imageFile: File) => {
    const formData = new FormData()
    formData.append('file', imageFile)
    
    return await useFetch(`/api/recitals/${recitalId}/program/cover`, {
      method: 'PUT',
      body: formData
    })
  }
  
  /**
   * Generate and download program PDF
   */
  const generateProgramPDF = async (recitalId: string) => {
    // Use different approach for file download
    const { data, error } = await useFetch(`/api/recitals/${recitalId}/performances/export`)
    
    if (error.value) {
      throw new Error(error.value.message || 'Failed to generate PDF')
    }
    
    return data.value
  }
  
  return {
    fetchRecitals,
    fetchRecital,
    createRecital,
    updateRecital,
    deleteRecital,
    fetchRecitalProgram,
    saveRecitalProgram,
    updateArtisticNote,
    updateAcknowledgments,
    uploadCoverImage,
    generateProgramPDF
  }
}