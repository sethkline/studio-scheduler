import { defineStore } from 'pinia'

interface WorkloadSummary {
  totalHours: number
  classesByDay: Record<number, number>
  hoursByDay: Record<number, number>
  classesByStyle: Record<string, number>
  hoursByStyle: Record<string, number>
}

export const useTeacherWorkloadStore = defineStore('teacherWorkload', {
  state: () => ({
    workloadData: [] as any[],
    workloadSummary: null as WorkloadSummary | null,
    loading: false,
    error: null as string | null,
    dateRange: {
      startDate: null as Date | null,
      endDate: null as Date | null
    }
  }),
  
  getters: {
    hoursByDay: (state) => {
      if (!state.workloadSummary) return {}
      return state.workloadSummary.hoursByDay
    },
    
    classesByDay: (state) => {
      if (!state.workloadSummary) return {}
      return state.workloadSummary.classesByDay
    },
    
    hoursByStyle: (state) => {
      if (!state.workloadSummary) return {}
      return state.workloadSummary.hoursByStyle
    },
    
    classesByStyle: (state) => {
      if (!state.workloadSummary) return {}
      return state.workloadSummary.classesByStyle
    },
    
    totalHours: (state) => {
      if (!state.workloadSummary) return 0
      return state.workloadSummary.totalHours
    },
    
    averageHoursPerDay: (state) => {
      if (!state.workloadSummary || !state.dateRange.startDate || !state.dateRange.endDate) return 0
      
      const days = Math.ceil((state.dateRange.endDate.getTime() - state.dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))
      return state.workloadSummary.totalHours / days
    }
  },
  
  actions: {
    async fetchTeacherWorkload(teacherId: string, startDate: Date, endDate: Date) {
      const client = useSupabaseClient()
      this.loading = true
      this.error = null
      this.dateRange.startDate = startDate
      this.dateRange.endDate = endDate
      
      try {
        // Format dates for the query
        const formattedStartDate = startDate.toISOString().split('T')[0]
        const formattedEndDate = endDate.toISOString().split('T')[0]
        
        // Query the schedule classes for this teacher within the date range
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
              class_definition:class_definition_id (
                id,
                name,
                duration,
                dance_style:dance_style_id (
                  id,
                  name,
                  color
                )
              )
            ),
            studio:studio_id (id, name)
          `)
          .eq('teacher_id', teacherId)
          .order('day_of_week')
          .order('start_time')
        
        if (error) throw error
        
        this.workloadData = data
        
        // Calculate summary statistics
        this.calculateWorkloadSummary()
        
        return {
          workloadData: this.workloadData,
          workloadSummary: this.workloadSummary
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch teacher workload'
        console.error('Error fetching teacher workload:', error)
        return { workloadData: [], workloadSummary: null }
      } finally {
        this.loading = false
      }
    },
    
    calculateWorkloadSummary() {
      // Initialize summary object
      const summary: WorkloadSummary = {
        totalHours: 0,
        classesByDay: {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0},
        hoursByDay: {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0},
        classesByStyle: {},
        hoursByStyle: {}
      }
      
      // Process each class
      this.workloadData.forEach(classItem => {
        // Get the day of week
        const dayOfWeek = classItem.day_of_week
        
        // Get the dance style
        const danceStyle = classItem.class_instance?.class_definition?.dance_style?.name || 'Unknown'
        
        // Calculate hours for this class
        const startTime = new Date(`2000-01-01T${classItem.start_time}`)
        const endTime = new Date(`2000-01-01T${classItem.end_time}`)
        const classHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        
        // Increment total hours
        summary.totalHours += classHours
        
        // Increment classes and hours by day
        summary.classesByDay[dayOfWeek] = (summary.classesByDay[dayOfWeek] || 0) + 1
        summary.hoursByDay[dayOfWeek] = (summary.hoursByDay[dayOfWeek] || 0) + classHours
        
        // Increment classes and hours by style
        summary.classesByStyle[danceStyle] = (summary.classesByStyle[danceStyle] || 0) + 1
        summary.hoursByStyle[danceStyle] = (summary.hoursByStyle[danceStyle] || 0) + classHours
      })
      
      this.workloadSummary = summary
    },
    
    exportWorkloadData(format: 'csv' | 'excel' = 'csv') {
      if (!this.workloadData.length) {
        throw new Error('No workload data to export')
      }
      
      const formattedData = this.workloadData.map(item => {
        const danceStyle = item.class_instance?.class_definition?.dance_style?.name || 'Unknown'
        const startTime = item.start_time
        const endTime = item.end_time
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][item.day_of_week]
        const className = item.class_instance?.name || 'Unnamed Class'
        const studioName = item.studio?.name || 'Unknown Studio'
        
        return {
          className,
          day: dayOfWeek,
          startTime,
          endTime,
          danceStyle,
          studio: studioName
        }
      })
      
      if (format === 'csv') {
        // Convert to CSV
        const headers = Object.keys(formattedData[0]).join(',')
        const rows = formattedData.map(item => Object.values(item).join(','))
        return [headers, ...rows].join('\n')
      } else {
        // For Excel, we'd normally use a library like ExcelJS
        // For now, return the formatted data that could be passed to such a library
        return formattedData
      }
    }
  }
})