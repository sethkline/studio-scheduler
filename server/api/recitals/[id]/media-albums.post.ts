import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const recitalShowId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const user = event.context.user

  if (!body.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Album name is required' })
  }

  try {
    const { data: album, error } = await client
      .from('media_albums')
      .insert([{
        recital_show_id: recitalShowId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        privacy: body.privacy || 'parents_only',
        is_featured: body.is_featured || false,
        photo_count: 0,
        video_count: 0,
        created_by_user_id: user?.id || null,
      }])
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to create album' })

    return { message: 'Album created successfully', album }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Failed to create album' })
  }
})
