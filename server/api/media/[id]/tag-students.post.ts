import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Get user profile to check role
  const { data: profile } = await client
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'staff'].includes(profile.user_role)) {
    throw createError({
      statusCode: 403,
      message: 'Permission denied',
    })
  }

  const mediaId = getRouterParam(event, 'id')
  const body = await readBody<{ student_ids: string[] }>(event)

  if (!mediaId) {
    throw createError({
      statusCode: 400,
      message: 'Media ID is required',
    })
  }

  if (!body.student_ids || body.student_ids.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'At least one student ID is required',
    })
  }

  // Delete existing tags for this media item
  await client
    .from('media_student_tags')
    .delete()
    .eq('media_item_id', mediaId)

  // Create new tags
  const tags = body.student_ids.map((studentId) => ({
    media_item_id: mediaId,
    student_id: studentId,
    tagged_by: user.id,
  }))

  const { data: createdTags, error } = await client
    .from('media_student_tags')
    .insert(tags)
    .select()

  if (error) {
    console.error('Error tagging students:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to tag students',
    })
  }

  return createdTags
})
