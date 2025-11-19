// Cron Job: Send volunteer shift reminders
// Story 2.1.5: Volunteer Coordination Center
// This endpoint should be called daily by a cron service (e.g., cron-job.org, GitHub Actions, etc.)
// Example: curl https://your-domain.com/api/cron/volunteer-reminders

export default defineEventHandler(async (event) => {
  // Simple authentication check - you could add a secret token
  const authHeader = getHeader(event, 'authorization')
  const config = useRuntimeConfig()

  // Optional: Verify cron secret
  // if (authHeader !== `Bearer ${config.cronSecret}`) {
  //   throw createError({
  //     statusCode: 401,
  //     message: 'Unauthorized'
  //   })
  // }

  try {
    // Call the send-reminders endpoint
    const result = await $fetch('/api/volunteer-shifts/send-reminders', {
      method: 'POST',
      baseURL: config.public.siteUrl || 'http://localhost:3000'
    })

    return {
      success: true,
      timestamp: new Date().toISOString(),
      result
    }
  } catch (error: any) {
    console.error('Cron job error:', error)
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message
    }
  }
})
