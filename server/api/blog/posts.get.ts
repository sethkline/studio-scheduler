import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event)

  const { category, search, limit = 50, offset = 0 } = query

  let queryBuilder = client
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (category) {
    queryBuilder = queryBuilder.eq('category', category)
  }

  if (search) {
    queryBuilder = queryBuilder.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`)
  }

  queryBuilder = queryBuilder.range(Number(offset), Number(offset) + Number(limit) - 1)

  const { data, error } = await queryBuilder

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch blog posts',
      data: error,
    })
  }

  return data || []
})
