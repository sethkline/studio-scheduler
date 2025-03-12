import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    userProfile: null,
    loading: false,
    error: null
  }),
  
  getters: {
    isAdmin: (state) => state.userProfile?.user_role === 'admin',
    isTeacher: (state) => state.userProfile?.user_role === 'teacher',
    isStaff: (state) => state.userProfile?.user_role === 'staff',
    hasRole: (state) => (roles) => {
      if (!state.userProfile) return false
      return roles.includes(state.userProfile.user_role)
    }
  },
  
  actions: {
    async fetchUserProfile() {
      const client = useSupabaseClient()
      const user = useSupabaseUser()
      
      if (!user.value) return null
      
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', user.value.id)
          .single()
          
        if (error) throw error
        
        this.userProfile = data
        return data
      } catch (error) {
        this.error = error.message
        console.error('Error fetching user profile:', error)
        return null
      } finally {
        this.loading = false
      }
    }
  }
})