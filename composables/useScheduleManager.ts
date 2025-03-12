export function useScheduleManager() {
  const client = useSupabaseClient()
  const toast = useToast()
  
  const isCreating = ref(false)
  const isUpdating = ref(false)
  const isDeleting = ref(false)
  
  // Function to create a draggable schedule item
  const createDraggableItem = (item) => {
    return {
      id: item.id,
      title: item.className,
      start: new Date(`2023-01-0${item.dayOfWeek+1}T${item.startTime}`),
      end: new Date(`2023-01-0${item.dayOfWeek+1}T${item.endTime}`),
      backgroundColor: item.danceStyleColor,
      classInstanceId: item.classInstanceId,
      teacherName: item.teacherName,
      studioName: item.studioName,
      danceStyle: item.danceStyle,
      // Add additional properties as needed
    }
  }
  
  // Function to handle a schedule item drop (when dragged & dropped)
  const handleItemDrop = async (dropInfo) => {
    isUpdating.value = true
    
    try {
      const { event, oldEvent } = dropInfo
      
      // Calculate new day and time
      const newDayOfWeek = event.start.getDay()
      const newStartTime = `${event.start.getHours().toString().padStart(2, '0')}:${event.start.getMinutes().toString().padStart(2, '0')}:00`
      const newEndTime = `${event.end.getHours().toString().padStart(2, '0')}:${event.end.getMinutes().toString().padStart(2, '0')}:00`
      
      // Update in database
      const { data, error } = await client
        .from('schedule_classes')
        .update({
          day_of_week: newDayOfWeek,
          start_time: newStartTime,
          end_time: newEndTime
        })
        .eq('id', event.id)
        .select()
      
      if (error) throw error
      
      toast.add({
        severity: 'success',
        summary: 'Schedule Updated',
        detail: 'Class has been rescheduled successfully',
        life: 3000
      })
      
      return data[0]
    } catch (error) {
      console.error('Error updating schedule:', error)
      
      toast.add({
        severity: 'error',
        summary: 'Update Failed',
        detail: error.message || 'Failed to update the schedule',
        life: 3000
      })
      
      throw error
    } finally {
      isUpdating.value = false
    }
  }
  
  // Check for scheduling conflicts
  const checkConflicts = (items, newItem) => {
    const conflicts = []
    
    // Check for time conflicts in the same studio
    const studioConflicts = items.filter(item => 
      item.day_of_week === newItem.day_of_week && 
      item.studio_id === newItem.studio_id &&
      item.id !== newItem.id
    )
    
    for (const item of studioConflicts) {
      const itemStart = new Date(`2000-01-01T${item.start_time}`)
      const itemEnd = new Date(`2000-01-01T${item.end_time}`)
      const newStart = new Date(`2000-01-01T${newItem.start_time}`)
      const newEnd = new Date(`2000-01-01T${newItem.end_time}`)
      
      // Check for overlap
      if (
        (newStart >= itemStart && newStart < itemEnd) || // New class starts during existing class
        (newEnd > itemStart && newEnd <= itemEnd) || // New class ends during existing class
        (newStart <= itemStart && newEnd >= itemEnd) // New class completely overlaps existing class
      ) {
        conflicts.push({
          type: 'studio',
          item,
          message: `Studio conflict with ${item.class_instance?.name || 'another class'}`
        })
      }
    }
    
    // Add more conflict checks as needed (teacher availability, etc.)
    
    return conflicts
  }
  
  return {
    isCreating,
    isUpdating,
    isDeleting,
    createDraggableItem,
    handleItemDrop,
    checkConflicts
  }
}