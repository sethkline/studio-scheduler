// server/api/recitals/[id]/performances/export.get.ts
import { getSupabaseClient } from '../../../../utils/supabase'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { createError, sendStream } from 'h3'
import { Readable } from 'stream'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const recitalId = getRouterParam(event, 'id')
    
    if (!recitalId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Recital ID is required'
      })
    }
    
    // Get all necessary data for the PDF generation
    
    // 1. Get recital details
    const { data: recital, error: recitalError } = await client
      .from('recitals')
      .select('id, name, description, date, location, theme, program_notes')
      .eq('id', recitalId)
      .single()
    
    if (recitalError) {
      console.error('Error fetching recital:', recitalError)
      return createError({
        statusCode: 404,
        statusMessage: 'Recital not found'
      })
    }
    
    // 2. Get program details
    const { data: program, error: programError } = await client
      .from('recital_programs')
      .select('id, cover_image_url, artistic_director_note, acknowledgments')
      .eq('recital_id', recitalId)
      .single()
    
    // Program might not exist yet
    if (programError && programError.code !== 'PGRST116') {
      console.error('Error fetching program:', programError)
    }
    
    // 3. Get performances
    const { data: performances, error: perfError } = await client
      .from('recital_performances')
      .select(`
        id, 
        performance_order,
        song_title,
        song_artist,
        duration,
        notes,
        choreographer,
        class_instance:class_instance_id (
          id,
          name,
          class_definition:class_definition_id (
            id,
            name,
            dance_style:dance_style_id (id, name, color)
          )
        )
      `)
      .eq('recital_id', recitalId)
      .order('performance_order')
    
    if (perfError) {
      console.error('Error fetching performances:', perfError)
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to retrieve performance data'
      })
    }
    
    // 4. Get advertisements
    const { data: advertisements, error: adsError } = await client
      .from('recital_program_advertisements')
      .select('id, title, description, image_url, order_position')
      .eq('recital_program_id', program?.id || '')
      .order('order_position')
    
    if (adsError && program) {
      console.error('Error fetching advertisements:', adsError)
    }
    
    // 5. For each performance, get the enrolled students
    const performancesWithStudents = await Promise.all(
      performances.map(async (performance) => {
        const { data: enrollments, error: enrollError } = await client
          .from('enrollments')
          .select(`
            id,
            student:student_id (
              id, 
              first_name, 
              last_name
            )
          `)
          .eq('class_instance_id', performance.class_instance.id)
          .eq('status', 'active')
        
        if (enrollError) {
          console.error(`Error fetching students for performance ${performance.id}:`, enrollError)
          return {
            ...performance,
            students: []
          }
        }
        
        return {
          ...performance,
          students: enrollments.map(e => e.student).filter(Boolean)
        }
      })
    )
    
    // Now create the PDF
    const pdfDoc = await PDFDocument.create()
    
    // Load standard fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
    
    // Add cover page
    const coverPage = pdfDoc.addPage()
    const { width, height } = coverPage.getSize()
    
    // Cover page content
    coverPage.drawText(recital.name, {
      x: 50,
      y: height - 100,
      size: 28,
      font: helveticaBold,
      color: rgb(0, 0, 0)
    })
    
    coverPage.drawText(`Date: ${new Date(recital.date).toLocaleDateString()}`, {
      x: 50,
      y: height - 150,
      size: 14,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    })
    
    coverPage.drawText(`Location: ${recital.location || 'TBD'}`, {
      x: 50,
      y: height - 180,
      size: 14,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    })
    
    if (recital.theme) {
      coverPage.drawText(`Theme: ${recital.theme}`, {
        x: 50,
        y: height - 210,
        size: 14,
        font: helveticaOblique,
        color: rgb(0, 0, 0)
      })
    }
    
    // Add table of contents page
    const tocPage = pdfDoc.addPage()
    
    tocPage.drawText('Program', {
      x: 50,
      y: height - 50,
      size: 20,
      font: helveticaBold,
      color: rgb(0, 0, 0)
    })
    
    let yPosition = height - 100
    
    // Add performances to TOC
    for (let i = 0; i < performancesWithStudents.length; i++) {
      const perf = performancesWithStudents[i]
      const className = perf.class_instance.name
      const songInfo = perf.song_title ? `"${perf.song_title}"` : ''
      const artist = perf.song_artist ? ` - ${perf.song_artist}` : ''
      
      tocPage.drawText(`${i + 1}. ${className}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font: helveticaBold,
        color: rgb(0, 0, 0)
      })
      
      if (songInfo) {
        tocPage.drawText(`${songInfo}${artist}`, {
          x: 70,
          y: yPosition - 15,
          size: 10,
          font: helveticaOblique,
          color: rgb(0, 0, 0)
        })
        yPosition -= 35
      } else {
        yPosition -= 20
      }
      
      // Add a new page if we're running out of space
      if (yPosition < 50) {
        tocPage = pdfDoc.addPage()
        yPosition = height - 50
      }
    }
    
    // Add performance details pages
    for (const perf of performancesWithStudents) {
      const perfPage = pdfDoc.addPage()
      
      const className = perf.class_instance.name
      const danceStyle = perf.class_instance.class_definition.dance_style?.name || 'N/A'
      const songInfo = perf.song_title ? `"${perf.song_title}"` : 'TBD'
      const artist = perf.song_artist ? `by ${perf.song_artist}` : ''
      const choreographer = perf.choreographer ? `Choreography by ${perf.choreographer}` : ''
      
      // Performance title
      perfPage.drawText(className, {
        x: 50,
        y: height - 50,
        size: 18,
        font: helveticaBold,
        color: rgb(0, 0, 0)
      })
      
      // Dance style
      perfPage.drawText(`Style: ${danceStyle}`, {
        x: 50,
        y: height - 80,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      })
      
      // Song info
      perfPage.drawText(`${songInfo} ${artist}`, {
        x: 50,
        y: height - 100,
        size: 12,
        font: helveticaOblique,
        color: rgb(0, 0, 0)
      })
      
      // Choreographer
      if (choreographer) {
        perfPage.drawText(choreographer, {
          x: 50,
          y: height - 120,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0)
        })
      }
      
      // Dancers
      yPosition = height - 160
      
      perfPage.drawText('Performers:', {
        x: 50,
        y: yPosition,
        size: 14,
        font: helveticaBold,
        color: rgb(0, 0, 0)
      })
      
      yPosition -= 25
      
      // List all students
      if (perf.students && perf.students.length > 0) {
        const studentsPerColumn = 20
        const columns = Math.ceil(perf.students.length / studentsPerColumn)
        const columnWidth = (width - 100) / columns
        
        for (let i = 0; i < perf.students.length; i++) {
          const student = perf.students[i]
          const column = Math.floor(i / studentsPerColumn)
          const rowInColumn = i % studentsPerColumn
          
          const xPosition = 50 + (column * columnWidth)
          const studentYPosition = yPosition - (rowInColumn * 20)
          
          perfPage.drawText(`${student.first_name} ${student.last_name}`, {
            x: xPosition,
            y: studentYPosition,
            size: 10,
            font: helveticaFont,
            color: rgb(0, 0, 0)
          })
        }
      } else {
        perfPage.drawText('No enrolled students', {
          x: 50,
          y: yPosition,
          size: 10,
          font: helveticaOblique,
          color: rgb(0, 0, 0)
        })
      }
    }
    
    // If program exists, add artistic director's note
    if (program && program.artistic_director_note) {
      const notePage = pdfDoc.addPage()
      
      notePage.drawText('Artistic Director\'s Note', {
        x: 50,
        y: height - 50,
        size: 18,
        font: helveticaBold,
        color: rgb(0, 0, 0)
      })
      
      // Break the note into lines of about 80 characters
      const note = program.artistic_director_note
      const noteLines = []
      let remaining = note
      const lineLength = 80
      
      while (remaining.length > 0) {
        if (remaining.length <= lineLength) {
          noteLines.push(remaining)
          remaining = ''
        } else {
          // Find the last space before lineLength
          let cutoff = remaining.lastIndexOf(' ', lineLength)
          if (cutoff === -1) cutoff = lineLength // If no space found, just cut at lineLength
          
          noteLines.push(remaining.substring(0, cutoff))
          remaining = remaining.substring(cutoff + 1)
        }
      }
      
      yPosition = height - 100
      
      for (const line of noteLines) {
        perfPage.drawText(line, {
          x: 50,
          y: yPosition,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0)
        })
        yPosition -= 15
      }
    }
    
    // If program exists, add acknowledgments
    if (program && program.acknowledgments) {
      const acksPage = pdfDoc.addPage()
      
      acksPage.drawText('Acknowledgments', {
        x: 50,
        y: height - 50,
        size: 18,
        font: helveticaBold,
        color: rgb(0, 0, 0)
      })
      
      // Break the acknowledgments into lines of about 80 characters
      const acks = program.acknowledgments
      const acksLines = []
      let remaining = acks
      const lineLength = 80
      
      while (remaining.length > 0) {
        if (remaining.length <= lineLength) {
          acksLines.push(remaining)
          remaining = ''
        } else {
          // Find the last space before lineLength
          let cutoff = remaining.lastIndexOf(' ', lineLength)
          if (cutoff === -1) cutoff = lineLength // If no space found, just cut at lineLength
          
          acksLines.push(remaining.substring(0, cutoff))
          remaining = remaining.substring(cutoff + 1)
        }
      }
      
      yPosition = height - 100
      
      for (const line of acksLines) {
        acksPage.drawText(line, {
          x: 50,
          y: yPosition,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0)
        })
        yPosition -= 15
      }
    }
    
    // Generate the PDF bytes
    const pdfBytes = await pdfDoc.save()
    
    // Convert to readable stream
    const stream = new Readable()
    stream.push(Buffer.from(pdfBytes))
    stream.push(null)
    
    // Set response headers for file download
    setResponseHeaders(event, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="recital-program-${recital.name.replace(/[^a-z0-9]/gi, '-')}.pdf"`
    })
    
    // Send the PDF as a stream
    return sendStream(event, stream)
  } catch (error) {
    console.error('Generate program PDF API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to generate program PDF'
    })
  }
})