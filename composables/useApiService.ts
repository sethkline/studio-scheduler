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

  const fetchRooms = async (params = {}) => {
    return await useFetch('/api/studio/rooms', { params })
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

   // Dance Styles
   const fetchDanceStyles = async () => {
    return await useFetch('/api/dance-styles')
  }
  
  const fetchDanceStyle = async (id) => {
    return await useFetch(`/api/dance-styles/${id}`)
  }
  
  const createDanceStyle = async (styleData) => {
    return await useFetch('/api/dance-styles/add', {
      method: 'POST',
      body: styleData
    })
  }
  
  const updateDanceStyle = async (id, styleData) => {
    return await useFetch(`/api/dance-styles/${id}`, {
      method: 'PUT',
      body: styleData
    })
  }
  
  const deleteDanceStyle = async (id) => {
    return await useFetch(`/api/dance-styles/${id}`, {
      method: 'DELETE'
    })
  }
  
  // Class Levels
  const fetchClassLevels = async () => {
    return await useFetch('/api/class-levels')
  }
  
  const fetchClassLevel = async (id) => {
    return await useFetch(`/api/class-levels/${id}`)
  }
  
  const createClassLevel = async (levelData) => {
    return await useFetch('/api/class-levels/add', {
      method: 'POST',
      body: levelData
    })
  }
  
  const updateClassLevel = async (id, levelData) => {
    return await useFetch(`/api/class-levels/${id}`, {
      method: 'PUT',
      body: levelData
    })
  }
  
  const deleteClassLevel = async (id) => {
    return await useFetch(`/api/class-levels/${id}`, {
      method: 'DELETE'
    })
  }

  // Teachers
  const fetchTeachers = async (params = {}) => {
    return await useFetch('/api/teachers', { params })
  }
  
  const fetchTeacher = async (teacherId) => {
    return await useFetch(`/api/teachers/${teacherId}`)
  }
  
  const createTeacher = async (teacherData) => {
    return await useFetch('/api/teachers/add', {
      method: 'POST',
      body: teacherData
    })
  }
  
  const updateTeacher = async (id, teacherData) => {
    return await useFetch(`/api/teachers/${id}`, {
      method: 'PUT',
      body: teacherData
    })
  }
  
  const deleteTeacher = async (id) => {
    return await useFetch(`/api/teachers/${id}`, {
      method: 'DELETE'
    })
  }

  const fetchTeacherAvailability = async (teacherId, params = {}) => {
    return await useFetch(`/api/teachers/${teacherId}/availability-list`, { params })
  }
  
  const createTeacherAvailability = async (teacherId, availabilityData) => {
    return await useFetch(`/api/teachers/${teacherId}/availability-list`, {
      method: 'POST',
      body: availabilityData
    })
  }
  
  const updateTeacherAvailability = async (teacherId, availabilityData) => {
    return await useFetch(`/api/teachers/${teacherId}/availability-list`, {
      method: 'PUT',
      body: availabilityData
    })
  }
  
  const deleteTeacherAvailability = async (teacherId, availabilityId) => {
    return await useFetch(`/api/teachers/${teacherId}/availability-list`, {
      method: 'DELETE',
      body: { id: availabilityId }
    })
  }
  
  const createTeacherException = async (teacherId, exceptionData) => {
    return await useFetch(`/api/teachers/${teacherId}/exceptions`, {
      method: 'POST',
      body: exceptionData
    })
  }
  
  const updateTeacherException = async (teacherId, id, exceptionData) => {
    return await useFetch(`/api/teachers/${teacherId}/exceptions/${id}`, {
      method: 'PUT',
      body: exceptionData
    })
  }
  
  const deleteTeacherException = async (teacherId: string, id: string) => {
    return await useFetch(`/api/teachers/${teacherId}/exceptions/delete`, {
      method: 'POST',
      body: { id: id } 
    })
  }

  const fetchTeacherWorkload = async (teacherId, params = {}) => {
  return await useFetch(`/api/teachers/${teacherId}/workload`, { params })
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
    fetchRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    fetchDanceStyles,
    fetchDanceStyle,
    createDanceStyle,
    updateDanceStyle,
    deleteDanceStyle,
    fetchClassLevels,
    fetchClassLevel,
    createClassLevel,
    updateClassLevel,
    deleteClassLevel,
    fetchTeachers,
    fetchTeacher,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    fetchTeacherAvailability,
    createTeacherAvailability,
    updateTeacherAvailability,
    deleteTeacherAvailability,
    createTeacherException,
    updateTeacherException,
    deleteTeacherException,
    fetchTeacherWorkload
  }
}