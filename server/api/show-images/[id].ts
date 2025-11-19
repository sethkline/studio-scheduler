// server/api/show-images/[id].ts
import { getUserSupabaseClient } from '../utils/supabase';

export default defineEventHandler(async (event) => {
  try {
    // Public endpoint - querying public data only

    const client = getSupabaseClient();
    const id = getRouterParam(event, 'id');
    const query = getQuery(event);
    const showName = (query.name as string) || 'Dance Recital';
    
    // Check if we have a custom image stored for this show
    const { data: showData, error: showError } = await client
      .from('recital_shows')
      .select('image_url')
      .eq('id', id)
      .single();
    
    // If we have a custom image, redirect to it
    if (showData?.image_url) {
      // Return a 302 redirect to the actual image
      setResponseStatus(event, 302);
      setResponseHeader(event, 'Location', showData.image_url);
      return '';
    }
    
    // If not, check for default images by show theme or type
    const { data: seriesData, error: seriesError } = await client
      .from('recital_shows')
      .select(`
        series:series_id (
          theme,
          id
        )
      `)
      .eq('id', id)
      .single();
    
    // Try to find a themed image based on the series theme
    const theme = seriesData?.series?.theme?.toLowerCase() || '';
    let imageUrl = '';
    
    // Map themes to default image URLs
    // In a real application, you might have these stored in a table or configuration
    if (theme.includes('ballet') || theme.includes('classical')) {
      imageUrl = '/images/themes/ballet.jpg';
    } else if (theme.includes('jazz') || theme.includes('modern')) {
      imageUrl = '/images/themes/jazz.jpg';
    } else if (theme.includes('hip hop') || theme.includes('street')) {
      imageUrl = '/images/themes/hiphop.jpg';
    } else if (theme.includes('tap')) {
      imageUrl = '/images/themes/tap.jpg';
    } else {
      // Default theme image
      imageUrl = '/images/themes/dance-recital.jpg';
    }
    
    // Redirect to the appropriate image
    if (imageUrl) {
      setResponseStatus(event, 302);
      setResponseHeader(event, 'Location', imageUrl);
      return '';
    }
    
    // If all else fails, redirect to a placeholder image with the show name
    const placeholderUrl = `/api/placeholder/600/300?text=${encodeURIComponent(showName)}`;
    setResponseStatus(event, 302);
    setResponseHeader(event, 'Location', placeholderUrl);
    return '';
  } catch (error) {
    console.error('Show image API error:', error);
    
    // If anything fails, redirect to a generic placeholder
    setResponseStatus(event, 302);
    setResponseHeader(event, 'Location', '/api/placeholder/600/300?text=Dance%20Recital');
    return '';
  }
});