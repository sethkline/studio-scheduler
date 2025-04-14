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

  // Recital Series
  const fetchRecitalSeries = async (params = {}) => {
    return await useFetch('/api/recital-series', { params })
  }
  
  const fetchRecitalSeriesById = async (id) => {
    return await useFetch(`/api/recital-series/${id}`)
  }
  
  const createRecitalSeries = async (seriesData) => {
    return await useFetch('/api/recital-series/add', {
      method: 'POST',
      body: seriesData
    })
  }
  
  const updateRecitalSeries = async (id, seriesData) => {
    return await useFetch(`/api/recital-series/${id}`, {
      method: 'PUT',
      body: seriesData
    })
  }
  
  const deleteRecitalSeries = async (id) => {
    return await useFetch(`/api/recital-series/${id}`, {
      method: 'DELETE'
    })
  }

  // Recital Shows
  const fetchRecitalShows = async (seriesId) => {
    return await useFetch(`/api/recital-series/${seriesId}/shows`)
  }
  
  const fetchRecitalShowById = async (id) => {
    return await useFetch(`/api/recital-shows/${id}`)
  }
  
  const createRecitalShow = async (showData) => {
    return await useFetch('/api/recital-shows/add', {
      method: 'POST',
      body: showData
    })
  }
  
  const updateRecitalShow = async (id, showData) => {
    return await useFetch(`/api/recital-shows/${id}`, {
      method: 'PUT',
      body: showData
    })
  }
  
  const deleteRecitalShow = async (id) => {
    return await useFetch(`/api/recital-shows/${id}`, {
      method: 'DELETE'
    })
  }
  
  // Recital Programs
  const fetchRecitalProgram = async (showId) => {
    return await useFetch(`/api/recital-shows/${showId}/program`)
  }
  
  const updateProgramDetails = async (showId, programData) => {
    return await useFetch(`/api/recital-shows/${showId}/program`, {
      method: 'POST',
      body: programData
    })
  }
  
  const uploadCoverImage = async (showId, imageFile) => {
    const formData = new FormData()
    formData.append('file', imageFile)
    
    return await useFetch(`/api/recital-shows/${showId}/program/cover`, {
      method: 'PUT',
      body: formData
    })
  }
  
  const updateProgramContentByType = async (showId, type, content) => {
    return await useFetch(`/api/recital-shows/${showId}/program/${type}`, {
      method: 'PUT',
      body: { content }
    })
  }
  
  const updatePerformanceOrder = async (showId, performanceIds) => {
    return await useFetch(`/api/recital-shows/${showId}/performances/reorder`, {
      method: 'PUT',
      body: { performanceOrder: performanceIds }
    })
  }
  
  const updatePerformance = async (showId, performanceId, performanceData) => {
    return await useFetch(`/api/recital-shows/${showId}/performances/${performanceId}`, {
      method: 'PUT',
      body: performanceData
    })
  }
  
  const generateProgramPDF = async (showId) => {
    return await useFetch(`/api/recital-shows/${showId}/program/export`, {
      responseType: 'blob'
    })
  }
    
    // Recital Shows
    const fetchShow = async (id) => {
      return await useFetch(`/api/recital-shows/${id}`)
    }
    
    const updateShow = async (id, showData) => {
      return await useFetch(`/api/recital-shows/${id}`, {
        method: 'PUT',
        body: showData
      })
    }
    
    const deleteShow = async (id) => {
      return await useFetch(`/api/recital-shows/${id}`, {
        method: 'DELETE'
      })
    }
    
    // Ticket Configuration
    const updateTicketConfig = async (showId, configData) => {
      return await useFetch(`/api/recital-shows/${showId}/ticket-config`, {
        method: 'PUT',
        body: configData
      })
    }
    
    // Seat Management
    // const fetchSeatLayouts = async () => {
    //   return await useFetch('/api/seat-layouts')
    // }
    
    // const fetchSeatLayoutDetails = async (layoutId) => {
    //   return await useFetch(`/api/seat-layouts/${layoutId}`)
    // }
    
    const generateSeatsForShow = async (showId) => {
      return await useFetch(`/api/recital-shows/${showId}/seats/generate`, {
        method: 'POST'
      });
    };
    
    const getSeatStatistics = async (showId) => {
      return await useFetch(`/api/recital-shows/${showId}/seats/statistics`)
    }
    
    const getAvailableSeats = async (showId, filters = {}) => {
      return await useFetch(`/api/recital-shows/${showId}/seats/available`, {
        params: filters
      })
    }
    
    const reserveSeats = async (showId, seatIds, email) => {
      return await useFetch(`/api/recital-shows/${showId}/seats/reserve`, {
        method: 'POST',
        body: {
          seat_ids: seatIds,
          email
        }
      })
    }
    
    // Program Management
    const fetchProgram = async (showId) => {
      return await useFetch(`/api/recital-shows/${showId}/program`)
    }
    
    const updateProgram = async (showId, programData) => {
      return await useFetch(`/api/recital-shows/${showId}/program`, {
        method: 'POST',
        body: programData
      })
    }

    const fetchShowSeats = async (showId, params = {}) => {
      return await useFetch(`/api/recital-shows/${showId}/seats`, { params })
    }
    
    const updateSeat = async (showId, seatId, seatData) => {
      return await useFetch(`/api/recital-shows/${showId}/seats/${seatId}`, {
        method: 'PUT',
        body: seatData
      })
    }
    
    const reserveMultipleSeats = async (showId, reservationData) => {
      return await useFetch(`/api/recital-shows/${showId}/seats/reserve-multiple`, {
        method: 'POST',
        body: reservationData
      })
    }
    
    const markHandicapSeats = async (showId, handicapData) => {
      return await useFetch(`/api/recital-shows/${showId}/seats/mark-handicap`, {
        method: 'POST',
        body: handicapData
      })
    }
    
    const updateSectionStatus = async (showId, sectionData) => {
      return await useFetch(`/api/recital-shows/${showId}/seats/update-section`, {
        method: 'POST',
        body: sectionData
      })
    }
  
    
    const fetchSeatSections = async (showId) => {
      const { data } = await fetchShowSeats(showId)
      if (data.value && data.value.sectionStats) {
        return data.value.sectionStats
      }
      return []
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
    fetchTeacherWorkload,
    fetchRecitalSeries,
    fetchRecitalSeriesById,
    createRecitalSeries,
    updateRecitalSeries,
    deleteRecitalSeries,
    
    fetchRecitalShows,
    fetchRecitalShowById,
    createRecitalShow,
    updateRecitalShow,
    deleteRecitalShow,
    
    fetchRecitalProgram,
    updateProgramDetails,
    uploadCoverImage,
    updateProgramContentByType,
    updatePerformanceOrder,
    updatePerformance,
    generateProgramPDF,


    fetchShow,
    updateShow,
    deleteShow,
    updateTicketConfig,
    generateSeatsForShow,
    getSeatStatistics,
    getAvailableSeats,
    reserveSeats,
    fetchProgram,
    updateProgram,
    fetchShowSeats,
    updateSeat,
    reserveMultipleSeats,
    markHandicapSeats,
    updateSectionStatus,
    fetchSeatSections
  }
}