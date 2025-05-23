// utils/image-utils.ts
export function getProxiedImageUrl(supabaseUrl: string) {
  if (!supabaseUrl) return null;
  
  try {
    // Parse the URL to extract the path
    const url = new URL(supabaseUrl);
    const pathSegments = url.pathname.split('/');
    
    // Find the index of "recital-covers" in the path
    const bucketIndex = pathSegments.findIndex(segment => segment === 'recital-covers');
    
    if (bucketIndex >= 0 && bucketIndex < pathSegments.length - 1) {
      // Extract everything after "recital-covers"
      const relativePath = pathSegments.slice(bucketIndex + 1).join('/');
      return `/api/images/${relativePath}`;
    }
  } catch (error) {
    console.error('Error converting image URL:', error);
  }
  
  // Return the original URL if transformation fails
  return supabaseUrl;
}