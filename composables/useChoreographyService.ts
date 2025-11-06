// composables/useChoreographyService.ts
// Service for managing choreography notes, formations, and video uploads

import type {
  ChoreographyNote,
  ChoreographyNoteInput,
  ChoreographyFormation,
  ChoreographyFormationInput,
  ChoreographyVersion,
  ChoreographyNoteDetailResponse,
  ChoreographyNotesResponse
} from '~/types'

export function useChoreographyService() {
  const toast = useToast()

  // Fetch all choreography notes with optional filters
  const fetchChoreographyNotes = async (filters: {
    class_instance_id?: string
    teacher_id?: string
    search?: string
  } = {}) => {
    try {
      const { data, error } = await useFetch<ChoreographyNotesResponse>('/api/choreography', {
        method: 'GET',
        params: filters
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to fetch choreography notes')
      }

      return data.value
    } catch (error: any) {
      console.error('Error fetching choreography notes:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to fetch choreography notes',
        life: 3000
      })
      throw error
    }
  }

  // Fetch single choreography note with details
  const fetchChoreographyNote = async (id: string) => {
    try {
      const { data, error } = await useFetch<ChoreographyNoteDetailResponse>(`/api/choreography/${id}`, {
        method: 'GET'
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to fetch choreography note')
      }

      return data.value
    } catch (error: any) {
      console.error('Error fetching choreography note:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to fetch choreography note',
        life: 3000
      })
      throw error
    }
  }

  // Create new choreography note
  const createChoreographyNote = async (noteData: ChoreographyNoteInput) => {
    try {
      const { data, error } = await useFetch<{ choreography_note: ChoreographyNote; message: string }>(
        '/api/choreography',
        {
          method: 'POST',
          body: noteData
        }
      )

      if (error.value) {
        throw new Error(error.value.message || 'Failed to create choreography note')
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Choreography note created successfully',
        life: 3000
      })

      return data.value?.choreography_note
    } catch (error: any) {
      console.error('Error creating choreography note:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to create choreography note',
        life: 3000
      })
      throw error
    }
  }

  // Update choreography note
  const updateChoreographyNote = async (id: string, updates: Partial<ChoreographyNoteInput>) => {
    try {
      const { data, error } = await useFetch<{ choreography_note: ChoreographyNote; message: string }>(
        `/api/choreography/${id}`,
        {
          method: 'PUT',
          body: updates
        }
      )

      if (error.value) {
        throw new Error(error.value.message || 'Failed to update choreography note')
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Choreography note updated successfully',
        life: 3000
      })

      return data.value?.choreography_note
    } catch (error: any) {
      console.error('Error updating choreography note:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to update choreography note',
        life: 3000
      })
      throw error
    }
  }

  // Delete choreography note
  const deleteChoreographyNote = async (id: string, hardDelete = false) => {
    try {
      const { error } = await useFetch(`/api/choreography/${id}`, {
        method: 'DELETE',
        params: { hard: hardDelete.toString() }
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to delete choreography note')
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Choreography note deleted successfully',
        life: 3000
      })

      return true
    } catch (error: any) {
      console.error('Error deleting choreography note:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to delete choreography note',
        life: 3000
      })
      throw error
    }
  }

  // Create formation
  const createFormation = async (formationData: ChoreographyFormationInput) => {
    try {
      const { data, error } = await useFetch<{ formation: ChoreographyFormation; message: string }>(
        '/api/choreography/formations',
        {
          method: 'POST',
          body: formationData
        }
      )

      if (error.value) {
        throw new Error(error.value.message || 'Failed to create formation')
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Formation created successfully',
        life: 3000
      })

      return data.value?.formation
    } catch (error: any) {
      console.error('Error creating formation:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to create formation',
        life: 3000
      })
      throw error
    }
  }

  // Update formation
  const updateFormation = async (id: string, updates: Partial<ChoreographyFormationInput>) => {
    try {
      const { data, error } = await useFetch<{ formation: ChoreographyFormation; message: string }>(
        `/api/choreography/formations/${id}`,
        {
          method: 'PUT',
          body: updates
        }
      )

      if (error.value) {
        throw new Error(error.value.message || 'Failed to update formation')
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Formation updated successfully',
        life: 3000
      })

      return data.value?.formation
    } catch (error: any) {
      console.error('Error updating formation:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to update formation',
        life: 3000
      })
      throw error
    }
  }

  // Delete formation
  const deleteFormation = async (id: string) => {
    try {
      const { error } = await useFetch(`/api/choreography/formations/${id}`, {
        method: 'DELETE'
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to delete formation')
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Formation deleted successfully',
        life: 3000
      })

      return true
    } catch (error: any) {
      console.error('Error deleting formation:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to delete formation',
        life: 3000
      })
      throw error
    }
  }

  // Upload video for choreography note
  const uploadVideo = async (
    choreographyId: string,
    videoFile: File,
    onProgress?: (progress: number) => void
  ) => {
    try {
      const formData = new FormData()
      formData.append('video', videoFile)
      formData.append('choreography_id', choreographyId)

      // Use XMLHttpRequest for progress tracking
      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const progress = Math.round((e.loaded / e.total) * 100)
            onProgress(progress)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText)
            toast.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Video uploaded successfully',
              life: 3000
            })
            resolve(response.video_url)
          } else {
            const error = JSON.parse(xhr.responseText)
            reject(new Error(error.statusMessage || 'Failed to upload video'))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during video upload'))
        })

        xhr.open('POST', '/api/choreography/video-upload')
        xhr.send(formData)
      })
    } catch (error: any) {
      console.error('Error uploading video:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to upload video',
        life: 3000
      })
      throw error
    }
  }

  return {
    fetchChoreographyNotes,
    fetchChoreographyNote,
    createChoreographyNote,
    updateChoreographyNote,
    deleteChoreographyNote,
    createFormation,
    updateFormation,
    deleteFormation,
    uploadVideo
  }
}
