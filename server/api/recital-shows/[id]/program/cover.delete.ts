// server/api/recital-shows/[id]/program/cover.delete.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase';

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event);
    const id = getRouterParam(event, 'id');
    
    // Get the existing program
    const { data: program, error: fetchError } = await client
      .from('recital_programs')
      .select('id, cover_image_url')
      .eq('recital_id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (!program) {
      return createError({
        statusCode: 404,
        statusMessage: 'Program not found'
      });
    }
    
    // If there's a cover image URL, extract the file path to delete
    if (program.cover_image_url) {
      // Extract path from URL - this depends on your URL structure
      const url = new URL(program.cover_image_url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(pathParts.indexOf('recital-covers') + 1).join('/');
      
      // Delete from storage if path extraction succeeded
      if (filePath) {
        const { error: deleteError } = await client.storage
          .from('recital-covers')
          .remove([filePath]);
          
        if (deleteError) {
          console.warn('Error deleting file from storage:', deleteError);
          // Continue anyway - we still want to clear the URL
        }
      }
    }
    
    // Update the program to remove the cover image URL
    const { error: updateError } = await client
      .from('recital_programs')
      .update({ cover_image_url: null })
      .eq('id', program.id);
    
    if (updateError) throw updateError;
    
    return {
      message: 'Cover image removed successfully',
      program: {
        ...program,
        cover_image_url: null
      }
    };
  } catch (error) {
    console.error('Remove cover image API error:', error);
    return createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to remove cover image'
    });
  }
});