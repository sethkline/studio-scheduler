// server/api/recital-shows/[id]/seats/[seatId].put.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const showId = getRouterParam(event, 'id')
    const seatId = getRouterParam(event, 'seatId')
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.status) {
      return createError({
        statusCode: 400,
        statusMessage: 'Status is required'
      })
    }
    
    // Check if status is valid
    const validStatuses = ['available', 'reserved', 'sold']
    if (!validStatuses.includes(body.status)) {
      return createError({
        statusCode: 400,
        statusMessage: 'Invalid status. Must be one of: available, reserved, sold'
      })
    }
    
    // Prepare update data
    const updateData = {
      status: body.status,
      seat_type: body.seat_type,
      handicap_access: body.handicap_access
    }
    
    // Add reservation expiration if status is 'reserved'
    if (body.status === 'reserved') {
      // Default to 30 minutes from now
      const expiryDate = new Date()
      expiryDate.setMinutes(expiryDate.getMinutes() + 30)
      
      updateData.reserved_until = body.reserved_until || expiryDate.toISOString()
      
      // In a real application, you would store customer reservation info in a separate table
      // For example:
      /*
      if (body.customer) {
        await client.from('seat_reservations').upsert({
          seat_id: seatId,
          customer_name: body.customer.name,
          customer_email: body.customer.email,
          customer_phone: body.customer.phone,
          notes: body.customer.notes,
          expires_at: updateData.reserved_until
        })
      }
      */
    } else if (body.status === 'available') {
      // Clear reservation time
      updateData.reserved_until = null
      
      // In a real application, you would delete any existing reservation
      /*
      await client.from('seat_reservations')
        .delete()
        .eq('seat_id', seatId)
      */
    }
    
    // Update seat
    const { data, error } = await client
      .from('show_seats')
      .update(updateData)
      .eq('id', seatId)
      .eq('show_id', showId)
      .select()
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return createError({
        statusCode: 404,
        statusMessage: 'Seat not found'
      })
    }
    
    return {
      message: 'Seat updated successfully',
      seat: data[0]
    }
  } catch (error) {
    console.error('Update seat API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update seat'
    })
  }
})