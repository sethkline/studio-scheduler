// server/api/recital-shows/[id]/program/export.get.ts
import { getSupabaseClient } from '../../../../utils/supabase'
import PDFDocument from 'pdfkit'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    
    // Fetch recital show details
    const { data: show, error: showError } = await client
      .from('recital_shows')
      .select(`
        id,
        name, 
        description,
        date,
        start_time,
        location,
        series:series_id (name, theme, year)
      `)
      .eq('id', id)
      .single()
    
    if (showError) throw showError
    
    // Fetch program details
    const { data: program, error: programError } = await client
      .from('recital_programs')
      .select('*')
      .eq('recital_id', id)
      .maybeSingle()
    
    if (programError) throw programError
    
    // Fetch performances
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
            dance_style:dance_style_id (
              id,
              name,
              color
            )
          )
        )
      `)
      .eq('recital_id', id)
      .order('performance_order')
    
    if (perfError) throw perfError
    
    // Fetch advertisements if program exists
    let advertisements = []
    if (program) {
      const { data: ads, error: adsError } = await client
        .from('recital_program_advertisements')
        .select('*')
        .eq('recital_program_id', program.id)
        .order('order_position')
      
      if (adsError) throw adsError
      advertisements = ads || []
    }
    
    // Create a new PDF document
    const doc = new PDFDocument({
      size: 'letter',
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      },
      info: {
        Title: `${show.name} - Program`,
        Author: show.series?.name || 'Dance Studio',
        Subject: 'Recital Program',
        Keywords: 'dance, recital, program',
        CreationDate: new Date()
      }
    })
    
    // Set response headers for PDF download
    event.node.res.setHeader('Content-Type', 'application/pdf')
    event.node.res.setHeader('Content-Disposition', `attachment; filename="recital-program-${show.name.replace(/\s+/g, '-').toLowerCase()}.pdf"`)
    
    // Generate PDF content (simplified example)
    // Cover Page
    doc.fontSize(24).text(show.series?.name || 'Dance Recital', {align: 'center'})
    doc.fontSize(28).text(show.name, {align: 'center'})
    
    if (show.series?.theme) {
      doc.moveDown()
      doc.fontSize(18).text(`Theme: ${show.series.theme}`, {align: 'center'})
    }
    
    doc.moveDown(2)
    doc.fontSize(14).text(`Date: ${new Date(show.date).toLocaleDateString()}`, {align: 'center'})
    doc.fontSize(14).text(`Time: ${show.start_time.substring(0, 5)}`, {align: 'center'})
    doc.fontSize(14).text(`Location: ${show.location}`, {align: 'center'})
    
    // Table of Contents
    doc.addPage()
    doc.fontSize(20).text('Program', {align: 'center'})
    doc.moveDown()
    
    performances.forEach((perf, index) => {
      doc.fontSize(12)
        .text(`${index + 1}. ${perf.song_title || 'Untitled'} - ${perf.class_instance?.name || 'Unknown Class'}`, {
          continued: false
        })
      doc.moveDown(0.5)
    })
    
    // Artistic Director's Note
    if (program?.artistic_director_note) {
      doc.addPage()
      doc.fontSize(18).text("Artistic Director's Note", {align: 'center'})
      doc.moveDown()
      
      // Convert HTML to plain text (simplified)
      const plainText = program.artistic_director_note.replace(/<[^>]*>/g, '')
      doc.fontSize(12).text(plainText, {align: 'left'})
    }
    
    // Performance Details
    performances.forEach((perf, index) => {
      doc.addPage()
      doc.fontSize(18).text(`Performance #${index + 1}`, {align: 'center'})
      doc.moveDown()
      
      doc.fontSize(14).text(`"${perf.song_title || 'Untitled'}"`, {align: 'center'})
      if (perf.song_artist) {
        doc.fontSize(12).text(`Artist: ${perf.song_artist}`, {align: 'center'})
      }
      doc.moveDown()
      
      doc.fontSize(14).text(`Class: ${perf.class_instance?.name || 'Unknown Class'}`, {align: 'left'})
      if (perf.choreographer) {
        doc.fontSize(12).text(`Choreographer: ${perf.choreographer}`, {align: 'left'})
      }
      
      if (perf.notes) {
        doc.moveDown()
        doc.fontSize(12).text(`Notes: ${perf.notes}`, {align: 'left'})
      }
    })
    
    // Acknowledgments
    if (program?.acknowledgments) {
      doc.addPage()
      doc.fontSize(18).text("Acknowledgments", {align: 'center'})
      doc.moveDown()
      
      // Convert HTML to plain text (simplified)
      const plainText = program.acknowledgments.replace(/<[^>]*>/g, '')
      doc.fontSize(12).text(plainText, {align: 'left'})
    }
    
    // Advertisements
    if (advertisements.length > 0) {
      doc.addPage()
      doc.fontSize(18).text("Sponsors", {align: 'center'})
      doc.moveDown()
      
      advertisements.forEach((ad) => {
        doc.fontSize(14).text(ad.title, {align: 'center'})
        
        if (ad.description) {
          doc.moveDown(0.5)
          doc.fontSize(12).text(ad.description, {align: 'center'})
        }
        
        doc.moveDown(2)
      })
    }
    
    // Finalize PDF
    doc.end()
    
    // Pipe the PDF to the response
    return doc.pipe(event.node.res)
  } catch (error) {
    console.error('Generate PDF error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to generate program PDF'
    })
  }
})