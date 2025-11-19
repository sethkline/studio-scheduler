// API Endpoint: Tag students in media
// Story 2.1.4: Recital Media Hub
// Creates tags linking students to media items

import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

interface TagRequest {
  mediaId: string
  studentIds: string[]
}

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const recitalId = getRouterParam(event, 'id')
  const body = await readBody<TagRequest>(event)
  const user = event.context.user

  if (!recitalId || !body.mediaId || !body.studentIds || body.studentIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Media ID and student IDs are required'
    })
  }

  const client = await getUserSupabaseClient(event)

  try {
    // Verify media belongs to this recital
    const { data: media, error: mediaError } = await client
      .from('recital_media')
      .select('id, recital_id')
      .eq('id', body.mediaId)
      .eq('recital_id', recitalId)
      .single()

    if (mediaError || !media) {
      throw createError({
        statusCode: 404,
        message: 'Media not found'
      })
    }

    // Create tags (using upsert to handle duplicates)
    const tags = body.studentIds.map((studentId) => ({
      media_id: body.mediaId,
      student_id: studentId,
      tagged_by: user?.id
    }))

    const { data: createdTags, error: tagError } = await client
      .from('recital_media_tags')
      .upsert(tags, {
        onConflict: 'media_id,student_id',
        ignoreDuplicates: true
      })
      .select()

    if (tagError) throw tagError

    return {
      success: true,
      tagsCreated: createdTags?.length || 0,
      tags: createdTags
    }
  } catch (error: any) {
    console.error('Error tagging media:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to tag media'
    })
  }
})
