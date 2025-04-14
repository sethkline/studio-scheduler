// server/api/recital-shows/[id]/seats/generate.post.ts
import { getSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    // First, delete any existing seats for this show
    const { error: deleteError } = await client
      .from('show_seats')
      .delete()
      .eq('show_id', id)
    
    if (deleteError) throw deleteError
    
    // Generate seats based on the custom theater layout
    const seats = generateCustomTheaterLayout(id)
    
    // Insert the seats
    if (seats.length > 0) {
      // For larger datasets, we might need to chunk the inserts
      const CHUNK_SIZE = 500; // Adjust based on your database limits
      for (let i = 0; i < seats.length; i += CHUNK_SIZE) {
        const chunk = seats.slice(i, i + CHUNK_SIZE);
        const { error: insertError } = await client
          .from('show_seats')
          .insert(chunk)
        
        if (insertError) throw insertError
      }
    }
    
    return {
      message: 'Seats generated successfully',
      seat_count: seats.length
    }
  } catch (error) {
    console.error('Generate seats API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to generate seats: ' + (error.message || 'Unknown error')
    })
  }
})

// Function to generate seats based on your custom theater layout
function generateCustomTheaterLayout(showId) {
  const seats = []
  const sections = ['left-wing', 'left-main', 'center-main', 'right-main', 'right-wing']
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V']
  
  // Add each seat based on section and row
  for (const section of sections) {
    for (const row of rows) {
      const seatNumbers = generateSeatNumbers(section, row)
      
      for (const seat of seatNumbers) {
        seats.push({
          show_id: showId,
          section: section,
          section_type: getSectionType(section),
          row_name: row,
          seat_number: seat.number,
          seat_type: seat.number.includes('HC') ? 'handicap' : 'regular',
          handicap_access: seat.number.includes('HC'),
          status: 'available',
          price_in_cents: null,
          reserved_until: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    }
  }
  
  return seats
}

// Map section to section type
function getSectionType(section) {
  switch (section) {
    case 'left-wing':
    case 'right-wing':
      return 'wing'
    case 'left-main':
    case 'right-main':
      return 'main'
    case 'center-main':
      return 'center'
    default:
      return 'main'
  }
}

// Generate seat numbers based on section and row
function generateSeatNumbers(section, row) {
  let seats = []
  
  // Helper function to generate sequence of numbers
  const generateSequence = (start, count, step = 1, decrement = false) => {
    const sequence = []
    for (let i = 0; i < count; i++) {
      const num = decrement ? start - i * step : start + i * step
      sequence.push(num)
    }
    return sequence
  }
  
  // Helper function for descending sequence
  function generateDescendingSequence(start, count, step = -1) {
    return Array.from({ length: count }, (_, i) => start + i * step)
  }
  
  switch (section) {
    case 'left-wing':
      const numbersLeftWing = generateSequence(11, 6, 2, true)  // From 11 down by 2
      seats = numbersLeftWing.map((num, index) => ({
        number: `${num}`,
        display_order: index + 1
      }))
      break
      
    case 'right-wing':
      const numbersRightWing = generateSequence(2, 6, 2)  // From 2 up by 2
      seats = numbersRightWing.map((num, index) => ({
        number: `${num}`,
        display_order: index + 1
      }))
      break
      
    case 'left-main':
      if (row === 'A') {
        seats = [103, 101, 'HC2', 'HC1'].map((num, index) => ({
          number: `${num}`,
          display_order: index + 1
        }))
      } else if (row === 'B') {
        seats = Array.from({ length: 5 }, (_, index) => 109 - 2 * index)
          .map((num, index) => ({
            number: `${num}`,
            display_order: index + 1
          }))
      } else if (row >= 'C' && row < 'I') {
        const startNumber = 111 + 2 * (row.charCodeAt(0) - 'C'.charCodeAt(0))
        const numbers = [startNumber, ...Array.from({ length: ((startNumber - 101) / 2) }, (_, index) => startNumber - 2 * (index + 1))]
        seats = numbers.map((num, index) => ({
          number: `${num}`,
          display_order: index + 1
        }))
      } else if (row > 'I' && row <= 'L') {
        const offset = row.charCodeAt(0) - 'C'.charCodeAt(0) - 1
        const startNumber = 111 + 2 * offset
        const numbers = [startNumber, ...Array.from({ length: ((startNumber - 101) / 2) }, (_, index) => startNumber - 2 * (index + 1))]
        seats = numbers.map((num, index) => ({
          number: `${num}`,
          display_order: index + 1
        }))
      } else if (row >= 'L' && row <= 'U') {
        const numbers = Array.from({ length: 14 }, (_, index) => 127 - 2 * index)
        seats = numbers.map((num, index) => ({
          number: `${num}`,
          display_order: index + 1
        }))
      } else if (row === 'V') {
        let initialSeats = Array.from({ length: 6 }, (_, index) => 121 - 2 * index)
        let finalSeats = Array.from({ length: 4 }, (_, index) => 107 - 2 * index)
        const numbers = [...initialSeats, 'HC2', 'HC1', ...finalSeats]
        seats = numbers.map((num, index) => ({
          number: `${num}`,
          display_order: index + 1
        }))
      }
      break
      
    case 'right-main':
      if (row === 'A') {
        seats = ['HC1', 'HC2', 102, 104].map((num, index) => ({
          number: `${num}`,
          display_order: index + 1
        }))
      } else if (row === 'V') {
        let initialSeats = Array.from({ length: 4 }, (_, index) => 102 + 2 * index)
        let finalSeats = Array.from({ length: 6 }, (_, index) => 110 + 2 * index)
        const numbers = [...initialSeats, 'HC1', 'HC2', ...finalSeats]
        seats = numbers.map((num, index) => ({
          number: `${num}`,
          display_order: index + 1
        }))
      } else {
        let rowLetterIndex = row.charCodeAt(0) - 'B'.charCodeAt(0) + 1
        if (row > 'I') {
          rowLetterIndex -= 1
        }
        
        let numberOfSeats = 5
        if (row >= 'B' && row < 'L') {
          numberOfSeats = 5 + rowLetterIndex - 1
        } else if (row >= 'L' && row <= 'U') {
          numberOfSeats = (128 - 102) / 2 + 1
        }
        
        const numbers = generateSequence(102, numberOfSeats, 2)
        seats = numbers.map((num, index) => ({
          number: `${num}`,
          display_order: index + 1
        }))
      }
      break
      
    case 'center-main':
      if (row === 'A') {
        seats = [207, 206, 'HC1', 'HC2', 205, 204, 203, 'HC3', 'HC4', 202, 201].map((num, index) => ({
          number: `${num}`,
          display_order: index + 1
        }))
      } else if (row === 'V') {
        let initialSeats = generateDescendingSequence(211, 5)
        let finalSeats = generateDescendingSequence(206, 6)
        const numbers = [...initialSeats, 'HC1', 'HC2', 'HC3', ...finalSeats]
        seats = numbers.map((num, index) => ({
          number: `${num}`,
          display_order: index + 1
        }))
      } else {
        const numbers = generateDescendingSequence(214, 14)
        seats = numbers.map((num, index) => ({
          number: `${num}`,
          display_order: index + 1
        }))
      }
      break
  }
  
  // Add row prefix to each seat number
  return seats.map(seat => ({
    number: `${row}${seat.number}`,
    display_order: seat.display_order
  }))
}