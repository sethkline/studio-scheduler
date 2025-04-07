// tests/api/recitals/program.get.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEvent } from 'h3'
import getRecitalProgram from '../../../server/api/recitals/[id]/program/index.get'

// Mock the Supabase client
vi.mock('../../../utils/supabase', () => ({
  getSupabaseClient: () => ({
    from: (table) => {
      const mockTables = {
        // Your existing mock tables implementation
      }
      
      return mockTables[table] || {
        select: () => ({
          eq: () => ({
            single: () => ({ data: null, error: new Error('Table not found') })
          })
        })
      }
    }
  })
}))

describe('GET /api/recitals/:id/program', () => {
  let event

  beforeEach(() => {
    event = createEvent({
      method: 'GET',
      url: '/api/recitals/recital-id/program'
    })

    vi.mocked(getRouterParam).mockImplementation((_, key) => {
      if (key === 'id') return 'recital-id'
      return null
    })
  })
  
  })

  it('should return a complete recital program', async () => {
    const response = await getRecitalProgram(event)
    
    expect(response).toHaveProperty('recital')
    expect(response).toHaveProperty('program')
    expect(response).toHaveProperty('advertisements')
    expect(response).toHaveProperty('performances')
    
    expect(response.recital.name).toBe('Spring Recital 2025')
    expect(response.program.artistic_director_note).toBe('Director\'s note content')
    expect(response.advertisements).toHaveLength(2)
    expect(response.performances).toHaveLength(1)
    expect(response.performances[0].song_title).toBe('Dancing Queen')
  })
  
  it('should handle missing recital ID', async () => {
    vi.stubGlobal('getRouterParam', () => null)
    
    const response = await getRecitalProgram(event)
    
    expect(response).toHaveProperty('statusCode', 400)
    expect(response).toHaveProperty('statusMessage', 'Recital ID is required')
  })
  
  it('should handle recital not found', async () => {
    vi.stubGlobal('getRouterParam', () => 'non-existent-id')
    
    // Mock a failed recital fetch
    vi.mocked(getSupabaseClient).mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      })
    } as any)
    
    const response = await getRecitalProgram(event)
    
    expect(response).toHaveProperty('statusCode', 404)
    expect(response).toHaveProperty('statusMessage', 'Recital not found')
  })
  
  it('should handle missing program gracefully', async () => {
    // Mock recital exists but program doesn't
    vi.mocked(getSupabaseClient).mockReturnValueOnce({
      from: (table) => {
        if (table === 'recitals') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({
                  data: { id: 'recital-id', name: 'Spring Recital 2025' },
                  error: null
                })
              })
            })
          }
        } else if (table === 'recital_programs') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({
                  data: null,
                  error: { code: 'PGRST116' }
                })
              })
            })
          }
        } else {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  data: [],
                  error: null
                })
              })
            })
          }
        }
      }
    } as any)
    
    const response = await getRecitalProgram(event)
    
    expect(response).toHaveProperty('recital')
    expect(response.program).toBeNull()
    expect(response.advertisements).toEqual([])
  })
})