/**
 * POST /api/costume-catalog/admin/import
 *
 * Import costumes from CSV data
 * Requires admin/staff role
 *
 * Body:
 * - vendor_slug: Vendor identifier
 * - csv_data: Array of costume rows
 */

import { getSupabaseClient } from '~/server/utils/supabase'
import type { CostumeImportRow, CostumeImportResult } from '~/types/costume-catalog'

export default defineEventHandler(async (event): Promise<CostumeImportResult> => {
  const client = getSupabaseClient()
  const body = await readBody<{ vendor_slug: string; csv_data: CostumeImportRow[] }>(event)

  // Validate request
  if (!body.vendor_slug || !body.csv_data || !Array.isArray(body.csv_data)) {
    throw createError({
      statusCode: 400,
      message: 'vendor_slug and csv_data array are required'
    })
  }

  // Get vendor
  const { data: vendor, error: vendorError } = await client
    .from('vendors')
    .select('id')
    .eq('slug', body.vendor_slug)
    .single()

  if (vendorError || !vendor) {
    throw createError({
      statusCode: 404,
      message: `Vendor not found: ${body.vendor_slug}`
    })
  }

  const result: CostumeImportResult = {
    total_rows: body.csv_data.length,
    imported: 0,
    updated: 0,
    errors: []
  }

  // Process each row
  for (let i = 0; i < body.csv_data.length; i++) {
    const row = body.csv_data[i]

    try {
      // Validate required fields
      if (!row.vendor_sku || !row.name) {
        result.errors.push({
          row: i + 1,
          error: 'Missing required fields: vendor_sku and name'
        })
        continue
      }

      // Check if costume exists
      const { data: existing } = await client
        .from('costumes')
        .select('id')
        .eq('vendor_id', vendor.id)
        .eq('vendor_sku', row.vendor_sku)
        .single()

      const costumeData = {
        vendor_id: vendor.id,
        vendor_sku: row.vendor_sku,
        name: row.name,
        category: row.category?.toLowerCase(),
        description: row.description,
        season: row.season,
        gender: row.gender?.toLowerCase(),
        price_cents: row.price ? Math.round(row.price * 100) : null,
        currency: 'USD',
        availability: row.availability?.toLowerCase() || 'unknown',
        is_active: true
      }

      let costumeId: string

      if (existing) {
        // Update existing
        const { data, error } = await client
          .from('costumes')
          .update(costumeData)
          .eq('id', existing.id)
          .select('id')
          .single()

        if (error) throw error
        costumeId = data.id
        result.updated++
      } else {
        // Insert new
        const { data, error } = await client
          .from('costumes')
          .insert(costumeData)
          .select('id')
          .single()

        if (error) throw error
        costumeId = data.id
        result.imported++
      }

      // Process sizes if provided
      if (row.sizes && costumeId) {
        // Delete existing sizes
        await client
          .from('costume_sizes')
          .delete()
          .eq('costume_id', costumeId)

        // Insert new sizes
        const sizes = row.sizes.split(',').map((s, idx) => {
          const trimmed = s.trim()
          return {
            costume_id: costumeId,
            code: trimmed,
            label: trimmed,
            sort_order: idx
          }
        })

        if (sizes.length > 0) {
          await client.from('costume_sizes').insert(sizes)
        }
      }

      // Process colors if provided
      if (row.colors && costumeId) {
        // Delete existing colors
        await client
          .from('costume_colors')
          .delete()
          .eq('costume_id', costumeId)

        // Insert new colors
        const colors = row.colors.split(',').map((c, idx) => ({
          costume_id: costumeId,
          name: c.trim(),
          sort_order: idx
        }))

        if (colors.length > 0) {
          await client.from('costume_colors').insert(colors)
        }
      }

      // Process image URLs if provided
      if (row.image_urls && costumeId) {
        // Delete existing images
        await client
          .from('costume_images')
          .delete()
          .eq('costume_id', costumeId)

        // Insert new images
        const images = row.image_urls.split(',').map((url, idx) => ({
          costume_id: costumeId,
          url: url.trim(),
          sort_order: idx,
          is_primary: idx === 0
        }))

        if (images.length > 0) {
          await client.from('costume_images').insert(images)
        }
      }

    } catch (error: any) {
      result.errors.push({
        row: i + 1,
        error: error.message || 'Unknown error'
      })
    }
  }

  return result
})
