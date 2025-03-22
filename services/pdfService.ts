import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ScheduleClass } from '~/types';

// Define the options interface
interface SchedulePdfOptions {
  title: string;
  includeHeader: boolean;
  includeLegend: boolean;
  includeTeachers: boolean;
  landscape: boolean;
  classes: ScheduleClass[];
  danceStyles?: any[];
  studioName?: string;
  logoUrl?: string;
  scheduleRange?: string;
}

/**
 * Generate a PDF schedule
 */
export async function generateSchedulePdf(options: SchedulePdfOptions): Promise<Blob> {
  console.log('Classes for PDF:', options.classes);
  // Create a new PDF document
  const pdf = new jsPDF({
    orientation: options.landscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Page dimensions
  const pageWidth = options.landscape ? 297 : 210;
  const pageHeight = options.landscape ? 210 : 297;
  
  // Set up some constants
  const margin = 10;
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Add header if requested
  let yPosition = margin;
  
  if (options.includeHeader) {
    // Add logo if available
    if (options.logoUrl) {
      try {
        // In a real implementation, you would need to handle image loading
        // For simplicity, we'll just add a placeholder
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text('[Studio Logo]', margin, yPosition + 5);
      } catch (error) {
        console.error('Error adding logo:', error);
      }
    }
    
    // Add studio name
    pdf.setFontSize(16);
    pdf.setTextColor(0);
    pdf.text(options.studioName || 'Dance Studio', pageWidth / 2, yPosition + 10, { align: 'center' });
    
    // Add title
    pdf.setFontSize(14);
    pdf.text(options.title, pageWidth / 2, yPosition + 20, { align: 'center' });
    
    // Add date range if available
    if (options.scheduleRange) {
      pdf.setFontSize(10);
      pdf.text(options.scheduleRange, pageWidth / 2, yPosition + 28, { align: 'center' });
    }
    
    yPosition += 35;
  } else {
    // Just add the title
    pdf.setFontSize(14);
    pdf.text(options.title, pageWidth / 2, yPosition + 10, { align: 'center' });
    
    yPosition += 20;
  }
  
  // Group classes by day of week
  const classesByDay: Record<number, ScheduleClass[]> = {};
  
  options.classes.forEach(classItem => {
    if (!classesByDay[classItem.dayOfWeek]) {
      classesByDay[classItem.dayOfWeek] = [];
    }
    
    classesByDay[classItem.dayOfWeek].push(classItem);
  });
  
  // Print each day's schedule
  Object.entries(classesByDay).forEach(([dayIndex, classes]) => {
    const dayName = daysOfWeek[parseInt(dayIndex)];
    
    // Add day header
    pdf.setFontSize(12);
    pdf.setTextColor(0);
    pdf.text(dayName, margin, yPosition);
    
    yPosition += 5;
    
    // Sort classes by start time
    const sortedClasses = [...classes].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
    
    // Prepare table data
    const tableData = sortedClasses.map(cls => {
      const startTime = formatTime(cls.startTime);
      const endTime = formatTime(cls.endTime);
      
      // Base row with time and class name
      const row = [
        `${startTime} - ${endTime}`,
        cls.className
      ];
      
      // Add teacher if requested
      if (options.includeTeachers) {
        row.push(cls.teacherName || 'TBD');
      }
      
      // Add studio
      row.push(cls.studioName);
      
      return row;
    });
    
    // Define table headers
    const headers = ['Time', 'Class'];
    if (options.includeTeachers) {
      headers.push('Teacher');
    }
    headers.push('Studio');
    
    autoTable(pdf, {
      head: [headers],
      body: tableData,
      startY: yPosition,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 35 },  // Time column
        1: { cellWidth: 'auto' }, // Class name
      },
      bodyStyles: { fontSize: 9 },
      headStyles: { 
        fillColor: [70, 70, 70],
        textColor: 255,
        fontSize: 10
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    
    // Get the last table's final Y position
    // @ts-ignore - TypeScript might complain about the lastAutoTable property
    yPosition = (pdf as any).lastAutoTable.finalY + 15;
    
    // Add a new page if needed
    if (yPosition > pageHeight - margin * 2 && Object.keys(classesByDay).length > 1) {
      pdf.addPage();
      yPosition = margin;
    }
  });
  
  // Add class style legend if requested
  if (options.includeLegend && options.danceStyles && options.danceStyles.length > 0) {
    // Check if we need a new page for the legend
    if (yPosition > pageHeight - 50) {
      pdf.addPage();
      yPosition = margin;
    }
    
    // Add legend title
    pdf.setFontSize(12);
    pdf.text('Dance Style Legend', margin, yPosition);
    
    yPosition += 10;
    
    // Create a grid of style colors with labels
    const itemsPerRow = 3;
    const itemWidth = (pageWidth - margin * 2) / itemsPerRow;
    const itemHeight = 10;
    
    options.danceStyles.forEach((style, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      
      const x = margin + (col * itemWidth);
      const y = yPosition + (row * itemHeight);
      
      // Draw color box
      pdf.setFillColor(hexToRgb(style.color || '#cccccc'));
      pdf.rect(x, y, 5, 5, 'F');
      
      // Add style name
      pdf.setFontSize(9);
      pdf.text(style.name, x + 8, y + 4);
    });
  }
  
  // Return the PDF as a blob
  return pdf.output('blob');
}

// Helper function to format time (e.g., "09:00:00" to "9:00 AM")
function formatTime(timeString: string): string {
  if (!timeString) return '';
  
  const [hourStr, minuteStr] = timeString.split(':');
  const hour = parseInt(hourStr);
  const minute = parseInt(minuteStr);
  
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

// Helper function to convert hex color to RGB
function hexToRgb(hex: string): number[] {
  // Default color if invalid
  if (!hex || !hex.startsWith('#')) {
    return [204, 204, 204]; // Default gray
  }
  
  // Remove the hash
  hex = hex.slice(1);
  
  // Convert 3-digit hex to 6-digit
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return [r, g, b];
}