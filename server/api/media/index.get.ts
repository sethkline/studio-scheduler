import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'
import type { MediaItemWithDetails } from '~/types/media'

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
  const mediaType = query.media_type as string | undefined
  const recitalId = query.recital_id as string | undefined
  const classInstanceId = query.class_instance_id as string | undefined
  const studentId = query.student_id as string | undefined

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

  let mediaQuery = client
    .from('media_items')
    .select(`
      *,
      recital:recitals (
        id,
        name
      ),
      class_instance:class_instances (
        id,
        name
      ),
      uploaded_by_user:profiles!media_items_uploaded_by_fkey (
        id,
        first_name,
        last_name
      )
    `)
    .order('upload_date', { ascending: false })

  // Apply filters
  if (mediaType) {
    mediaQuery = mediaQuery.eq('media_type', mediaType)
  }

  if (recitalId) {
    mediaQuery = mediaQuery.eq('recital_id', recitalId)
  }

  if (classInstanceId) {
    mediaQuery = mediaQuery.eq('class_instance_id', classInstanceId)
  }

  // If parent, filter to only media tagged to their students
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

    // Get all student IDs for this guardian
    const { data: relationships } = await client
      .from('student_guardian_relationships')
      .select('student_id')
      .eq('guardian_id', guardian.id)

    const studentIds = relationships?.map((r) => r.student_id) || []

    if (studentId) {
      // If filtering by specific student, verify it's theirs
      if (!studentIds.includes(studentId)) {
        throw createError({
          statusCode: 403,
          message: 'Access denied',
        })
      }
    }

    // Note: RLS policies will automatically filter to only media tagged to their students
  }

  const { data: mediaItems, error } = await mediaQuery

  if (error) {
    console.error('Error fetching media items:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch media items',
    })
  }

  // Fetch student tags for each media item
  const mediaIds = mediaItems?.map((m) => m.id) || []
  let tags: any[] = []

  if (mediaIds.length > 0) {
    const { data: tagData } = await client
      .from('media_student_tags')
      .select(`
        *,
        student:students (
          id,
          first_name,
          last_name
        )
      `)
      .in('media_item_id', mediaIds)

    tags = tagData || []
  }

  // If filtering by student, only return media tagged to that student
  let filteredMedia = mediaItems

  if (studentId) {
    const mediaIdsForStudent = tags
      .filter((tag) => tag.student_id === studentId)
      .map((tag) => tag.media_item_id)

    filteredMedia = mediaItems?.filter((media) => mediaIdsForStudent.includes(media.id))
  }

  // Merge tags with media and generate signed URLs
  const mediaWithDetails = await Promise.all(
    (filteredMedia || []).map(async (media) => {
      const mediaTags = tags.filter((t) => t.media_item_id === media.id)

      // Generate signed URL for download
      const { data: signedData } = await client.storage
        .from('recital-media')
        .createSignedUrl(media.file_path, 3600) // 1 hour expiry

      let thumbnailUrl
      if (media.thumbnail_path) {
        const { data: thumbData } = await client.storage
          .from('media-thumbnails')
          .createSignedUrl(media.thumbnail_path, 3600)
        thumbnailUrl = thumbData?.signedUrl
      }

      return {
        ...media,
        student_tags: mediaTags,
        download_url: signedData?.signedUrl,
        thumbnail_url: thumbnailUrl,
      }
    })
  )

  return mediaWithDetails as MediaItemWithDetails[]
})
