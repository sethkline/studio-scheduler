// server/api/recital-shows/[id]/ticket-config.put.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    // Validate request
    if (body.can_sell_tickets) {
      // If selling tickets, these fields are required
      if (!body.ticket_price_in_cents && body.ticket_price_in_cents !== 0) {
        return createError({
          statusCode: 400,
          statusMessage: 'Ticket price is required'
        })
      }
      
      if (!body.ticket_sale_start || !body.ticket_sale_end) {
        return createError({
          statusCode: 400,
          statusMessage: 'Ticket sale start and end dates are required'
        })
      }
      
      // If pre-sale is active, validate pre-sale dates
      if (body.is_pre_sale_active) {
        if (!body.pre_sale_start || !body.pre_sale_end) {
          return createError({
            statusCode: 400,
            statusMessage: 'Pre-sale start and end dates are required'
          })
        }
      }
    }
    
    // Prepare update data
    const updateData = {
      can_sell_tickets: body.can_sell_tickets,
      ticket_price_in_cents: body.ticket_price_in_cents,
      ticket_sale_start: body.ticket_sale_start,
      ticket_sale_end: body.ticket_sale_end,
      is_pre_sale_active: body.is_pre_sale_active,
      pre_sale_start: body.pre_sale_start,
      pre_sale_end: body.pre_sale_end,
      advance_ticket_sale_start: body.advance_ticket_sale_start,
      updated_at: new Date()
    }
    
    // Update show in database
    const { data, error } = await client
      .from('recital_shows')
      .update(updateData)
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return {
      message: 'Ticket configuration updated successfully',
      config: {
        can_sell_tickets: data[0].can_sell_tickets,
        ticket_price_in_cents: data[0].ticket_price_in_cents,
        ticket_sale_start: data[0].ticket_sale_start,
        ticket_sale_end: data[0].ticket_sale_end,
        is_pre_sale_active: data[0].is_pre_sale_active,
        pre_sale_start: data[0].pre_sale_start,
        pre_sale_end: data[0].pre_sale_end,
        advance_ticket_sale_start: data[0].advance_ticket_sale_start
      }
    }
  } catch (error) {
    console.error('Update ticket config API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update ticket configuration'
    })
  }
})