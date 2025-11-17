// API Endpoint: Get public recital information by slug
// Story 2.2.1: Public Recital Landing Page
// Returns public-facing recital data for marketing page

import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required'
    })
  }

  const client = getSupabaseClient()

  try {
    // Get recital by slug
    const { data: recital, error: recitalError } = await client
      .from('recitals')
      .select(`
        *,
        recital_shows (
          id,
          show_date,
          show_time,
          venue
        )
      `)
      .eq('public_slug', slug)
      .eq('is_public', true)
      .single()

    if (recitalError || !recital) {
      throw createError({
        statusCode: 404,
        message: 'Recital not found'
      })
    }

    // Get featured performers
    const { data: performers } = await client
      .from('recital_featured_performers')
      .select('*')
      .eq('recital_id', recital.id)
      .order('sort_order')

    // Get public gallery
    const { data: gallery } = await client
      .from('recital_public_gallery')
      .select('*')
      .eq('recital_id', recital.id)
      .order('sort_order')

    // Get public FAQ
    const { data: faq } = await client
      .from('recital_public_faq')
      .select('*')
      .eq('recital_id', recital.id)
      .eq('is_active', true)
      .order('sort_order')

    return {
      recital: {
        id: recital.id,
        name: recital.name,
        description: recital.public_description,
        programHighlights: recital.program_highlights,
        heroImageUrl: recital.hero_image_url,
        venueName: recital.venue_name,
        venueAddress: recital.venue_address,
        venueMapUrl: recital.venue_map_url,
        venueDirections: recital.venue_directions,
        metaDescription: recital.meta_description,
        showCountdown: recital.show_countdown,
        enableSocialShare: recital.enable_social_share,
        shows: recital.recital_shows
      },
      featuredPerformers: performers || [],
      gallery: gallery || [],
      faq: faq || []
    }
  } catch (error: any) {
    console.error('Error fetching public recital:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch recital'
    })
  }
})
