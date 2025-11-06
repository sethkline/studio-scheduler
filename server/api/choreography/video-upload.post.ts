// server/api/choreography/video-upload.post.ts
// Upload choreography video to Supabase Storage

import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const formData = await readMultipartFormData(event)

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No file provided'
      })
    }

    // Find the video file in form data
    const videoFile = formData.find(part => part.name === 'video')
    const choreographyId = formData.find(part => part.name === 'choreography_id')?.data.toString()

    if (!videoFile) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Video file is required'
      })
    }

    if (!choreographyId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Choreography ID is required'
      })
    }

    // Validate file type (videos only)
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
    if (videoFile.type && !allowedTypes.includes(videoFile.type)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid file type. Only video files are allowed (mp4, mov, avi, webm)'
      })
    }

    // Generate unique filename
    const fileExt = videoFile.filename?.split('.').pop() || 'mp4'
    const fileName = `${choreographyId}-${Date.now()}.${fileExt}`
    const filePath = `choreography-videos/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await client.storage
      .from('choreography-videos')
      .upload(filePath, videoFile.data, {
        contentType: videoFile.type || 'video/mp4',
        upsert: false
      })

    if (uploadError) {
      console.error('Video upload error:', uploadError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to upload video',
        data: uploadError
      })
    }

    // Get public URL
    const { data: { publicUrl } } = client.storage
      .from('choreography-videos')
      .getPublicUrl(filePath)

    // Update choreography note with video URL
    const { data: updateData, error: updateError } = await client
      .from('choreography_notes')
      .update({
        video_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', choreographyId)
      .select('id, video_url')
      .single()

    if (updateError) {
      console.error('Choreography update error:', updateError)
      // Still return success since video uploaded, but note the error
      return {
        video_url: publicUrl,
        uploaded: true,
        warning: 'Video uploaded but failed to update choreography note'
      }
    }

    return {
      video_url: publicUrl,
      choreography_id: choreographyId,
      message: 'Video uploaded successfully'
    }
  } catch (error: any) {
    console.error('Video upload API error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to upload video'
    })
  }
})
