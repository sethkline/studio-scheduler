// Create a cache system for teacher availability
import { ref } from 'vue';

export function useTeacherAvailabilityCache() {
  // Cache structure: { scheduleId_teacherId: availabilityData }
  const availabilityCache = ref({});
  const loadingStatus = ref({});

  // Fetch teacher availability and cache it
  const fetchTeacherAvailability = async (teacherId, scheduleId) => {
    const cacheKey = `${scheduleId}_${teacherId}`;
    
    // Return cached data if available
    if (availabilityCache.value[cacheKey]) {
      return availabilityCache.value[cacheKey];
    }
    
    // Don't fetch if already loading
    if (loadingStatus.value[cacheKey]) {
      // Wait for the loading to complete
      await new Promise(resolve => {
        const checkCache = () => {
          if (!loadingStatus.value[cacheKey]) {
            resolve();
          } else {
            setTimeout(checkCache, 100);
          }
        };
        checkCache();
      });
      
      return availabilityCache.value[cacheKey];
    }
    
    // Set loading status
    loadingStatus.value[cacheKey] = true;
    
    try {
      // Fetch teacher availability from API
      const response = await fetch(`/api/teachers/${teacherId}/availability-list?scheduleId=${scheduleId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch teacher availability: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the availability data
      availabilityCache.value[cacheKey] = data;
      
      return data;
    } catch (error) {
      console.error('Error fetching teacher availability:', error);
      return {
        regularAvailability: [],
        exceptions: []
      };
    } finally {
      // Clear loading status
      loadingStatus.value[cacheKey] = false;
    }
  };
  
  // Get availability for multiple teachers
  const fetchTeachersAvailability = async (teacherIds, scheduleId) => {
    const promises = teacherIds.map(teacherId => fetchTeacherAvailability(teacherId, scheduleId));
    await Promise.all(promises);
    
    // Combine all fetched data into a single object for lookup
    const result = {};
    teacherIds.forEach(teacherId => {
      const cacheKey = `${scheduleId}_${teacherId}`;
      result[teacherId] = availabilityCache.value[cacheKey] || {
        regularAvailability: [],
        exceptions: []
      };
    });
    
    return result;
  };
  
  // Prefetch availability for a list of schedule items
  const prefetchForScheduleItems = async (items, scheduleId) => {
    // Extract unique teacher IDs from items
    const teacherIds = Array.from(new Set(
      items
        .filter(item => item.teacherId)
        .map(item => item.teacherId)
    ));
    
    if (teacherIds.length > 0) {
      return await fetchTeachersAvailability(teacherIds, scheduleId);
    }
    
    return {};
  };
  
  // Get teacher availability (from cache or fetch)
  const getTeacherAvailability = async (teacherId, scheduleId) => {
    return await fetchTeacherAvailability(teacherId, scheduleId);
  };
  
  // Clear cache for specific teacher or all
  const clearCache = (teacherId = null, scheduleId = null) => {
    if (teacherId && scheduleId) {
      const cacheKey = `${scheduleId}_${teacherId}`;
      delete availabilityCache.value[cacheKey];
    } else if (scheduleId) {
      // Clear all teachers for this schedule
      Object.keys(availabilityCache.value).forEach(key => {
        if (key.startsWith(`${scheduleId}_`)) {
          delete availabilityCache.value[key];
        }
      });
    } else {
      // Clear all cache
      availabilityCache.value = {};
    }
  };
  
  return {
    fetchTeacherAvailability,
    fetchTeachersAvailability,
    prefetchForScheduleItems,
    getTeacherAvailability,
    clearCache,
    availabilityCache
  };
}