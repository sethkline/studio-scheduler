import { defineStore } from 'pinia'

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    scheduleItems: [],
    loading: false,
    error: null
  }),
  
  actions: {
    async fetchCurrentSchedule(scheduleId) {
      const client = useSupabaseClient()
      this.loading = true
      
      try {
        const { data, error } = await client
          .from('schedule_classes')
          .select(`
            id,
            day_of_week,
            start_time,
            end_time,
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
            studio:studio_id (id, name)
          `)
          .eq('schedule_id', scheduleId)
          .order('day_of_week')
          .order('start_time')
        
        if (error) throw error
        
        this.scheduleItems = data.map(item => ({
          id: item.id,
          dayOfWeek: item.day_of_week,
          startTime: item.start_time,
          endTime: item.end_time,
          classInstanceId: item.class_instance?.id,
          className: item.class_instance?.name,
          teacherName: item.class_instance?.teacher 
            ? `${item.class_instance.teacher.first_name} ${item.class_instance.teacher.last_name}`
            : 'No Teacher',
          danceStyle: item.class_instance?.class_definition?.dance_style?.name || 'Unknown',
          danceStyleColor: item.class_instance?.class_definition?.dance_style?.color || '#cccccc',
          studioName: item.studio?.name || 'No Studio'
        }))
        
        return this.scheduleItems
      } catch (error) {
        this.error = error.message
        console.error('Error fetching schedule:', error)
        return []
      } finally {
        this.loading = false
      }
    },
    
    async createScheduleItem(scheduleItem) {
      const client = useSupabaseClient()
      
      try {
        const { data, error } = await client
          .from('schedule_classes')
          .insert([scheduleItem])
          .select()
        
        if (error) throw error
        
        // Refresh schedule after adding item
        await this.fetchCurrentSchedule(scheduleItem.schedule_id)
        return data[0]
      } catch (error) {
        console.error('Error creating schedule item:', error)
        throw error
      }
    },
    
    async updateScheduleItem(id, updates) {
      const client = useSupabaseClient()
      
      try {
        const { data, error } = await client
          .from('schedule_classes')
          .update(updates)
          .eq('id', id)
          .select()
        
        if (error) throw error
        
        // Update local state
        const index = this.scheduleItems.findIndex(item => item.id === id)
        if (index !== -1) {
          this.scheduleItems[index] = { ...this.scheduleItems[index], ...updates }
        }
        
        return data[0]
      } catch (error) {
        console.error('Error updating schedule item:', error)
        throw error
      }
    },
    
    async deleteScheduleItem(id, scheduleId) {
      const client = useSupabaseClient()
      
      try {
        const { error } = await client
          .from('schedule_classes')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        // Refresh schedule after deletion
        await this.fetchCurrentSchedule(scheduleId)
        return true
      } catch (error) {
        console.error('Error deleting schedule item:', error)
        throw error
      }
    }
  }
})