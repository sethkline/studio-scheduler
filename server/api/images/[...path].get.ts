// server/api/images/[...path].get.ts
import { getUserSupabaseClient } from '../utils/supabase';

export default defineEventHandler(async (event) => {
  try {
    // Access the catch-all parameter correctly
    const pathParam = event.context.params.path;
    
    // Handle case where path might be an array in some Nuxt setups
    const path = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;
    
    console.log('Proxying image path:', path);
    
    // Public endpoint - querying public data only

    
    const client = getSupabaseClient();
    
    // Parse the path to determine the bucket and actual file path
    let bucket = 'studio-assets'; // Default bucket
    let filePath = path;
    
    // Check if path includes bucket name
    if (path.includes('/')) {
      const parts = path.split('/');
      // If the path starts with a bucket name we recognize
      if (['studio-assets', 'recital-covers', 'recital-ads'].includes(parts[0])) {
        bucket = parts[0];
        // Remove the bucket name from the path
        filePath = parts.slice(1).join('/');
      }
    }
    
    console.log(`Trying bucket: ${bucket}, path: ${filePath}`);
    
    // Try to get the file from the determined bucket
    const { data, error } = await client.storage
      .from(bucket)
      .download(filePath);
    
    // If not found in the initial bucket, try other buckets
    if (error) {
      const buckets = ['studio-assets', 'recital-covers', 'recital-ads'].filter(b => b !== bucket);
      
      for (const alternateBucket of buckets) {
        try {
          console.log(`Trying alternate bucket: ${alternateBucket}`);
          const result = await client.storage
            .from(alternateBucket)
            .download(filePath);
          
          if (result.data && !result.error) {
            data = result.data;
            error = null;
            break;
          }
        } catch (e) {
          console.log(`Error with bucket ${alternateBucket}:`, e);
        }
      }
    }
    
    if (!data || error) {
      console.error('Image not found in any bucket:', path);
      throw new Error(`Image not found: ${path}`);
    }
    
    // Determine content type based on file extension
    const extension = path.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (extension === 'jpg' || extension === 'jpeg') {
      contentType = 'image/jpeg';
    } else if (extension === 'png') {
      contentType = 'image/png';
    } else if (extension === 'webp') {
      contentType = 'image/webp';
    } else if (extension === 'gif') {
      contentType = 'image/gif';
    } else if (extension === 'svg') {
      contentType = 'image/svg+xml';
    }
    
    // Set appropriate headers
    setResponseHeader(event, 'Content-Type', contentType);
    setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000'); // Cache for a year
    
    // Return the file data
    return data;
  } catch (error) {
    console.error('Image proxy error:', error);
    return createError({
      statusCode: 404,
      statusMessage: 'Image not found'
    });
  }
});