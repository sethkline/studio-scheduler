import { defineStore } from 'pinia'
import type { ScheduleClass } from '~/types'

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    scheduleItems: [] as ScheduleClass[],
    loading: false,
    error: null as string | null
  }),
  
  actions: {
    async fetchCurrentSchedule(scheduleId) {
      this.loading = true;
      
      try {
        const client = useSupabaseClient();
        
        // Fetch schedule classes with related data
        const { data, error } = await client
          .from('schedule_classes')
          .select(`
            id,
            day_of_week,
            start_time,
            end_time,
            teacher_id,
            class_instance:class_instance_id (
              id,
              name,
              teacher:teacher_id (id, first_name, last_name),
              class_definition:class_definition_id (
                id,
                name,
                dance_style:dance_style_id (id, name, color)
              )
            ),
            studio:studio_room_id (id, name)
          `)
          .eq('schedule_id', scheduleId)
          .order('day_of_week')
          .order('start_time');
        
        if (error) throw error;
        
        // Transform the data to match what createDraggableItem expects
        this.scheduleItems = data.map(item => ({
          id: item.id,
          dayOfWeek: item.day_of_week,
          startTime: item.start_time,
          endTime: item.end_time,
          classInstanceId: item.class_instance?.id,
          className: item.class_instance?.name || 
                     item.class_instance?.class_definition?.name || 
                     'Unnamed Class',
          teacherId: item.teacher_id || item.class_instance?.teacher?.id,
          teacherName: null, // Set to null initially or keep the existing placeholder
          danceStyle: item.class_instance?.class_definition?.dance_style?.name || 'Unknown',
          danceStyleColor: item.class_instance?.class_definition?.dance_style?.color || '#cccccc',
          studioId: item.studio?.id || item.studio_id,
          studioName: item.studio?.name || 'No Studio'
        }));
    
        
        return this.scheduleItems;
      } catch (error) {
        this.error = error.message || 'Failed to fetch schedule';
        console.error('Error fetching schedule:', error);
        return [];
      } finally {
        this.loading = false;
      }
    },
    
    async createScheduleItem(scheduleItem) {
      this.loading = true
      this.error = null
      
      try {
        const { data: result, error } = await useFetch('/api/schedule-classes/add', {
          method: 'POST',
          body: {
            schedule_id: scheduleItem.schedule_id,
            class_instance_id: scheduleItem.class_instance_id,
            day_of_week: scheduleItem.day_of_week,
            start_time: scheduleItem.start_time,
            end_time: scheduleItem.end_time,
            studio_id: scheduleItem.studio_id,
            teacher_id: scheduleItem.teacher_id
          }
        })
        
        if (error.value) throw error.value
        
        // Refresh schedule after adding item
        await this.fetchCurrentSchedule(scheduleItem.schedule_id)
        return result.value.scheduleClass
      } catch (err) {
        this.error = err.message || 'Failed to create schedule item'
        console.error('Error creating schedule item:', err)
        throw err
      } finally {
        this.loading = false
      }
    },
    

    async updateScheduleItem(id, updates) {
      this.loading = true
      this.error = null
      
      try {
        console.log('Updating schedule item with data:', updates)
        
        const { data: result, error } = await useFetch(`/api/schedule-classes/${id}`, {
          method: 'PUT',
          body: updates
        })
        
        if (error.value) throw error.value
        
        // Log the API response
        console.log('API response for update:', result.value)
        
        // Update local state
        const index = this.scheduleItems.findIndex(item => item.id === id)
        if (index !== -1) {
          // Extract the relevant data from the API response
          const apiData = result.value.scheduleClass
          
          // Create a new updated item with all the data from the API
          const updatedItem = {
            id: apiData.id,
            dayOfWeek: apiData.day_of_week,
            startTime: apiData.start_time,
            endTime: apiData.end_time,
            classInstanceId: apiData.class_instance_id,
            className: apiData.class_instance?.name || 
                       apiData.class_instance?.class_definition?.name || 
                       'Unnamed Class',
            teacherId: apiData.teacher_id,
            teacherName: apiData.class_instance?.teacher ? 
                        `${apiData.class_instance.teacher.first_name} ${apiData.class_instance.teacher.last_name}` : 
                        'No Teacher',
            danceStyle: apiData.class_instance?.class_definition?.dance_style?.name || 'Unknown',
            danceStyleColor: apiData.class_instance?.class_definition?.dance_style?.color || '#cccccc',
            studioId: apiData.studio_room_id,
            studioName: apiData.studio?.name || 'No Studio'
          }
          
          console.log('Constructed updated item from API response:', updatedItem)
          
          // Update the item in the array
          this.scheduleItems[index] = updatedItem
          
          // Log the updated item for debugging
          console.log('Updated local schedule item:', this.scheduleItems[index])
        } else {
          console.warn(`Item with id ${id} not found in local state`)
        }
        
        return result.value.scheduleClass
      } catch (err) {
        this.error = err.message || 'Failed to update schedule item'
        console.error('Error updating schedule item:', err)
        throw err
      } finally {
        this.loading = false
      }
    },
    

    async deleteScheduleItem(id, scheduleId) {
      this.loading = true
      this.error = null
      
      try {
        const { error } = await useFetch(`/api/schedule-classes/${id}`, {
          method: 'DELETE'
        })
        
        if (error.value) throw error.value
        
        // Refresh schedule after deletion
        await this.fetchCurrentSchedule(scheduleId)
        return true
      } catch (err) {
        this.error = err.message || 'Failed to delete schedule item'
        console.error('Error deleting schedule item:', err)
        throw err
      } finally {
        this.loading = false
      }
    },
    
    async checkForConflicts(scheduleId: string, newItem: any) {
      const client = useSupabaseClient()
      
      try {
        // Fetch all schedule items for this schedule
        const { data, error } = await client
          .from('schedule_classes')
          .select(`
            id,
            day_of_week,
            start_time,
            end_time,
            studio_id,
            teacher_id,
            class_instance:class_instance_id (
              id,
              name,
              teacher:teacher_id (id, first_name, last_name)
            ),
            studio:studio_id (id, name)
          `)
          .eq('schedule_id', scheduleId)
        
        if (error) throw error
        
        const conflicts = []
        
        // Check for studio conflicts (same studio, same time)
        const studioConflicts = data.filter(item => 
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
            const className = item.class_instance?.name || 'another class'
            const studioName = item.studio?.name || 'this studio'
            const formattedStart = this.formatTimeForDisplay(item.start_time)
            const formattedEnd = this.formatTimeForDisplay(item.end_time)
            
            conflicts.push({
              type: 'studio',
              item,
              message: `Studio conflict with "${className}" in ${studioName} (${formattedStart} - ${formattedEnd})`
            })
          }
        }
        
        // Check for teacher conflicts (same teacher, same time)
        if (newItem.teacher_id) {
          const teacherConflicts = data.filter(item => 
            item.day_of_week === newItem.day_of_week && 
            item.teacher_id === newItem.teacher_id &&
            item.id !== newItem.id
          )
          
          for (const item of teacherConflicts) {
            const itemStart = new Date(`2000-01-01T${item.start_time}`)
            const itemEnd = new Date(`2000-01-01T${item.end_time}`)
            const newStart = new Date(`2000-01-01T${newItem.start_time}`)
            const newEnd = new Date(`2000-01-01T${newItem.end_time}`)
            
            // Check for overlap
            if (
              (newStart >= itemStart && newStart < itemEnd) || 
              (newEnd > itemStart && newEnd <= itemEnd) || 
              (newStart <= itemStart && newEnd >= itemEnd)
            ) {
              const className = item.class_instance?.name || 'another class'
              const teacherName = item.class_instance?.teacher 
                ? `${item.class_instance.teacher.first_name} ${item.class_instance.teacher.last_name}`
                : 'this teacher'
              const formattedStart = this.formatTimeForDisplay(item.start_time)
              const formattedEnd = this.formatTimeForDisplay(item.end_time)
              
              conflicts.push({
                type: 'teacher',
                item,
                message: `Teacher conflict: ${teacherName} is already teaching "${className}" (${formattedStart} - ${formattedEnd})`
              })
            }
          }
        }
        
        return conflicts
      } catch (err: any) {
        console.error('Error checking for conflicts:', err)
        return []
      }
    },
    
    // Helper method to format time for display in messages
    formatTimeForDisplay(timeString: string): string {
      if (!timeString) return ''
      
      try {
        const date = new Date(`2000-01-01T${timeString}`)
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      } catch (e) {
        return timeString
      }
    },
    
    // Method to batch update multiple schedule items at once
    async batchUpdateScheduleItems(items: { id: string, updates: any }[]) {
      this.loading = true
      this.error = null
      
      try {
        const updatePromises = items.map(item => 
          this.updateScheduleItem(item.id, item.updates)
        )
        
        await Promise.all(updatePromises)
        return true
      } catch (err: any) {
        this.error = err.message || 'Failed to batch update schedule items'
        console.error('Error batch updating schedule items:', err)
        throw err
      } finally {
        this.loading = false
      }
    }
  }
})