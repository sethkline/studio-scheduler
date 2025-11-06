import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.marketingSiteUrl || 'https://localhost:3000'

  const client = getSupabaseClient()

  // Static public pages
  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/about', priority: '0.8', changefreq: 'monthly' },
    { loc: '/classes', priority: '0.9', changefreq: 'weekly' },
    { loc: '/teachers', priority: '0.8', changefreq: 'monthly' },
    { loc: '/schedule', priority: '0.9', changefreq: 'weekly' },
    { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
    { loc: '/pricing', priority: '0.8', changefreq: 'monthly' },
    { loc: '/gallery', priority: '0.6', changefreq: 'weekly' },
    { loc: '/blog', priority: '0.7', changefreq: 'daily' },
  ]

  // Fetch published blog posts
  const { data: blogPosts } = await client
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  // Fetch public recital shows
  const { data: recitalShows } = await client
    .from('recital_shows')
    .select('id, updated_at')
    .eq('status', 'published')
    .order('date', { ascending: false })

  // Build sitemap XML
  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  // Add static pages
  for (const page of staticPages) {
    sitemap += '  <url>\n'
    sitemap += `    <loc>${baseUrl}${page.loc}</loc>\n`
    sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`
    sitemap += `    <priority>${page.priority}</priority>\n`
    sitemap += '  </url>\n'
  }

  // Add blog posts
  if (blogPosts && blogPosts.length > 0) {
    for (const post of blogPosts) {
      sitemap += '  <url>\n'
      sitemap += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`
      sitemap += `    <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>\n`
      sitemap += '    <changefreq>monthly</changefreq>\n'
      sitemap += '    <priority>0.6</priority>\n'
      sitemap += '  </url>\n'
    }
  }

  // Add recital shows
  if (recitalShows && recitalShows.length > 0) {
    for (const show of recitalShows) {
      sitemap += '  <url>\n'
      sitemap += `    <loc>${baseUrl}/public/recitals/${show.id}</loc>\n`
      sitemap += `    <lastmod>${new Date(show.updated_at).toISOString()}</lastmod>\n`
      sitemap += '    <changefreq>weekly</changefreq>\n'
      sitemap += '    <priority>0.7</priority>\n'
      sitemap += '  </url>\n'
    }
  }

  sitemap += '</urlset>'

  // Set appropriate headers
  setHeader(event, 'Content-Type', 'application/xml')
  setHeader(event, 'Cache-Control', 'public, max-age=3600') // Cache for 1 hour

  return sitemap
})
