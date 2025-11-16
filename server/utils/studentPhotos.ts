import type { SupabaseClient } from '@supabase/supabase-js'
import type { StudentProfile } from '~/types/parents'

/**
 * Generate signed URLs for student photos stored as file paths
 * @param client Supabase client
 * @param student Student with photo_url and photo_thumbnail_url as file paths
 * @param expiresIn URL expiration in seconds (default: 1 hour)
 * @returns Student with signed URLs
 */
export async function generateStudentPhotoUrls<T extends Pick<StudentProfile, 'photo_url' | 'photo_thumbnail_url'>>(
  client: SupabaseClient,
  student: T,
  expiresIn = 60 * 60 // 1 hour default
): Promise<T> {
  const result = { ...student }

  // Generate signed URL for main photo if path exists
  if (student.photo_url) {
    const { data, error } = await client.storage
      .from('student-photos')
      .createSignedUrl(student.photo_url, expiresIn)

    if (!error && data?.signedUrl) {
      result.photo_url = data.signedUrl
    }
  }

  // Generate signed URL for thumbnail if path exists
  if (student.photo_thumbnail_url) {
    const { data, error } = await client.storage
      .from('student-photos')
      .createSignedUrl(student.photo_thumbnail_url, expiresIn)

    if (!error && data?.signedUrl) {
      result.photo_thumbnail_url = data.signedUrl
    }
  }

  return result
}

/**
 * Generate signed URLs for an array of students
 * @param client Supabase client
 * @param students Array of students with photo paths
 * @param expiresIn URL expiration in seconds (default: 1 hour)
 * @returns Array of students with signed URLs
 */
export async function generateStudentPhotoUrlsBulk<T extends Pick<StudentProfile, 'photo_url' | 'photo_thumbnail_url'>>(
  client: SupabaseClient,
  students: T[],
  expiresIn = 60 * 60 // 1 hour default
): Promise<T[]> {
  return Promise.all(students.map(student => generateStudentPhotoUrls(client, student, expiresIn)))
}
