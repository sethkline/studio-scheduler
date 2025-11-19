import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'
import type { VolunteerRequirementWithDetails } from '~/types/volunteers'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const query = getQuery(event)
  const guardianId = query.guardian_id as string | undefined
  const recitalId = query.recital_id as string | undefined

  // Get user profile to check role
  const { data: profile } = await client
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw createError({
      statusCode: 404,
      message: 'User profile not found',
    })
  }

  let requirementsQuery = client
    .from('volunteer_requirements')
    .select(`
      *,
      guardian:guardians (
        id,
        first_name,
        last_name
      ),
      recital:recitals (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })

  // If parent, only show their own requirements
  if (profile.user_role === 'parent') {
    const { data: guardian } = await client
      .from('guardians')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!guardian) {
      throw createError({
        statusCode: 404,
        message: 'Guardian profile not found',
      })
    }

    requirementsQuery = requirementsQuery.eq('guardian_id', guardian.id)
  } else if (guardianId) {
    // Admin/staff can filter by guardian
    requirementsQuery = requirementsQuery.eq('guardian_id', guardianId)
  }

  if (recitalId) {
    requirementsQuery = requirementsQuery.eq('recital_id', recitalId)
  }

  const { data: requirements, error } = await requirementsQuery

  if (error) {
    console.error('Error fetching volunteer requirements:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch volunteer requirements',
    })
  }

  return requirements as VolunteerRequirementWithDetails[]
})
