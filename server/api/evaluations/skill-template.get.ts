/**
 * GET /api/evaluations/skill-template
 *
 * Get skill template for evaluation based on dance style and class level.
 * This helps teachers pre-populate evaluation forms with relevant skills.
 *
 * Query params:
 * - dance_style_id: UUID
 * - class_level_id: UUID
 *
 * Access: Teachers, Admin/Staff
 */

import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

    const danceStyleId = query.dance_style_id as string
    const classLevelId = query.class_level_id as string

    if (!danceStyleId || !classLevelId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Dance style ID and class level ID are required'
      })
    }

    // Get authenticated user
    const authHeader = event.node.req.headers.authorization
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await client.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Get user profile to check role
    const { data: profile } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    // Only teachers, admin, and staff can access skill templates
    if (!['teacher', 'admin', 'staff'].includes(profile?.user_role || '')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Permission denied'
      })
    }

    // Fetch skills for the specified dance style and level
    const { data: skills, error } = await client
      .from('skills')
      .select(`
        *,
        dance_style:dance_styles!skills_dance_style_id_fkey(id, name, color),
        class_level:class_levels!skills_class_level_id_fkey(id, name)
      `)
      .eq('dance_style_id', danceStyleId)
      .eq('class_level_id', classLevelId)
      .order('category')
      .order('display_order')

    if (error) throw error

    // Group skills by category
    const skillsByCategory = skills?.reduce((acc, skill) => {
      const category = skill.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(skill)
      return acc
    }, {} as Record<string, typeof skills>) || {}

    const categories = Object.keys(skillsByCategory).map(category => ({
      category,
      skills: skillsByCategory[category]
    }))

    return {
      skills: skills || [],
      categories,
      dance_style_id: danceStyleId,
      class_level_id: classLevelId
    }
  } catch (error: any) {
    console.error('Skill template API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch skill template'
    })
  }
})
