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

  const fetchStudioProfile = async () => {
    return await useFetch('/api/studio/profile')
  }
  
  const updateStudioProfile = async (profileData) => {
    return await useFetch('/api/studio/profile', {
      method: 'POST',
      body: profileData
    })
  }
  
  const fetchLocations = async (params = {}) => {
    return await useFetch('/api/studio/locations', { params })
  }
  
  const fetchLocationDetails = async (id) => {
    return await useFetch(`/api/studio/locations/${id}`)
  }
  
  const createLocation = async (locationData) => {
    return await useFetch('/api/studio/locations/add', {
      method: 'POST',
      body: locationData
    })
  }
  
  const updateLocation = async (id, locationData) => {
    return await useFetch(`/api/studio/locations/${id}`, {
      method: 'PUT',
      body: locationData
    })
  }
  
  const deleteLocation = async (id) => {
    return await useFetch(`/api/studio/locations/${id}`, {
      method: 'DELETE'
    })
  }
  
  const updateOperatingHours = async (hoursData) => {
    return await useFetch('/api/studio/hours/update', {
      method: 'POST',
      body: hoursData
    })
  }
  
  const createSpecialHours = async (specialHoursData) => {
    return await useFetch('/api/studio/hours/special', {
      method: 'POST',
      body: specialHoursData
    })
  }
  
  const deleteSpecialHours = async (id) => {
    return await useFetch(`/api/studio/hours/special/${id}`, {
      method: 'DELETE'
    })
  }
  
  const createRoom = async (roomData) => {
    return await useFetch('/api/studio/rooms/add', {
      method: 'POST',
      body: roomData
    })
  }
  
  const updateRoom = async (id, roomData) => {
    return await useFetch(`/api/studio/rooms/${id}`, {
      method: 'PUT',
      body: roomData
    })
  }
  
  const deleteRoom = async (id) => {
    return await useFetch(`/api/studio/rooms/${id}`, {
      method: 'DELETE'
    })
  }
  
  return {
    fetchDashboard,
    fetchClasses,
    fetchClass,
    createClass,
    updateClass,
    deleteClass,
    fetchStudents,
    fetchSchedule,
    fetchStudioProfile,
    updateStudioProfile,
    fetchLocations,
    fetchLocationDetails,
    createLocation,
    updateLocation,
    deleteLocation,
    updateOperatingHours,
    createSpecialHours,
    deleteSpecialHours,
    createRoom,
    updateRoom,
    deleteRoom
  }
}