<template>
  <div class="space-y-6">
    <div class="card">
      <h1 class="text-2xl font-bold text-primary-800 mb-4">Dance Studio Dashboard</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-primary-50 rounded-lg p-6 shadow">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-primary-700">Total Classes</h3>
              <p class="text-3xl font-bold mt-2">{{ statistics.totalClasses || 0 }}</p>
            </div>
            <i class="pi pi-book text-4xl text-primary-300"></i>
          </div>
        </div>
        
        <div class="bg-secondary-50 rounded-lg p-6 shadow">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-secondary-700">Active Students</h3>
              <p class="text-3xl font-bold mt-2">{{ statistics.activeStudents || 0 }}</p>
            </div>
            <i class="pi pi-users text-4xl text-secondary-300"></i>
          </div>
        </div>
        
        <div class="bg-green-50 rounded-lg p-6 shadow">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-green-700">Teachers</h3>
              <p class="text-3xl font-bold mt-2">{{ statistics.teachers || 0 }}</p>
            </div>
            <i class="pi pi-user text-4xl text-green-300"></i>
          </div>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Upcoming Classes</h2>
        <div v-if="loading" class="flex justify-center">
          <i class="pi pi-spin pi-spinner text-2xl"></i>
        </div>
        <div v-else-if="upcomingClasses.length === 0" class="text-gray-500">
          No upcoming classes found.
        </div>
        <ul v-else class="divide-y">
          <li v-for="classItem in upcomingClasses" :key="classItem.id" class="py-3">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <span :class="['badge', `badge-${classItem.dance_style?.toLowerCase() || 'default'}`]" 
                      class="inline-block px-2 py-1 rounded-full text-xs">
                  {{ classItem.dance_style }}
                </span>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium">{{ classItem.name }}</p>
                <p class="text-xs text-gray-500">{{ formatTime(classItem.start_time) }} - {{ formatTime(classItem.end_time) }}</p>
              </div>
            </div>
          </li>
        </ul>
      </div>
      
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Recent Activity</h2>
        <p class="text-gray-500">Activity feed will appear here.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const client = useSupabaseClient()
const user = useSupabaseUser()
const loading = ref(true)
const upcomingClasses = ref([])
const statistics = ref({
  totalClasses: 0,
  activeStudents: 0,
  teachers: 0
})

// Redirect if not authenticated
const router = useRouter()
if (!user.value) {
  router.push('/login')
}

onMounted(async () => {
  try {
    // Fetch upcoming classes
    const { data: classes, error } = await client
      .from('schedule_classes')
      .select(`
        id, 
        start_time, 
        end_time,
        class_instance:class_instance_id (
          name,
          class_definition:class_definition_id (
            dance_style:dance_style_id (name)
          )
        )
      `)
      .order('start_time')
      .limit(5)
    
    if (error) throw error
    
    upcomingClasses.value = classes.map(cls => ({
      id: cls.id,
      name: cls.class_instance?.name || 'Unnamed Class',
      start_time: cls.start_time,
      end_time: cls.end_time,
      dance_style: cls.class_instance?.class_definition?.dance_style?.name || 'Unknown'
    }))
    
    // Fetch statistics
    const [classesStats, studentsStats, teachersStats] = await Promise.all([
      client.from('class_instances').select('id', { count: 'exact' }),
      client.from('students').select('id', { count: 'exact' }).eq('status', 'active'),
      client.from('teachers').select('id', { count: 'exact' })
    ])
    
    statistics.value = {
      totalClasses: classesStats.count || 0,
      activeStudents: studentsStats.count || 0,
      teachers: teachersStats.count || 0
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
  } finally {
    loading.value = false
  }
})

const formatTime = (timeString) => {
  if (!timeString) return ''
  const date = new Date(`2000-01-01T${timeString}`)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>