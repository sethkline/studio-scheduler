// server/api/generate-program-pdf.post.ts
import puppeteer from 'puppeteer';
import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    // Get request body
    const body = await readBody(event);
    const { recitalId } = body;
    
    if (!recitalId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Recital ID is required'
      });
    }
    
    console.log('Generating PDF for recital:', recitalId);
    
    // Get base URL from environment or config
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    
    // Use the dedicated print page 
    const pageUrl = `${baseUrl}/recitals/shows/${recitalId}/print`;
    
    console.log('Navigating to print page URL:', pageUrl);
    
    // Launch browser with longer timeout
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new',
      timeout: 60000
    });
    
    const page = await browser.newPage();
    
    // Set longer timeouts
    await page.setDefaultNavigationTimeout(60000);
    
    // Set high-resolution viewport for print-quality output
    await page.setViewport({
      width: 1584,  // 5.5 inches × 4 = 22 inches × 72 DPI = 1584 pixels
      height: 2448, // 8.5 inches × 4 = 34 inches × 72 DPI = 2448 pixels
      deviceScaleFactor: 4  // Key for high resolution
    });
    
    console.log('Navigating to page...');
    
    // Navigate to print page with longer timeout
    await page.goto(pageUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log('Page loaded, waiting for content...');
    
    // Wait for both the selector and the data-loaded attribute
    await page.waitForSelector('.program-page', { 
      timeout: 30000,
      visible: true 
    });
    
    // Additional wait for page to be fully loaded (data attribute set in onMounted)
    await page.waitForSelector('body[data-page-loaded="true"]', {
      timeout: 30000
    });
    
    console.log('Content loaded, waiting 2 seconds for any animations...');
    
    // Give a moment for any final rendering
    await page.waitForTimeout(2000);
    
    console.log('Taking screenshot for debugging...');
    
    // Take a screenshot for debugging (optional)
    await page.screenshot({ path: '/tmp/program-debug.png' });
    
    console.log('Generating PDF...');
    
    // Add print-specific CSS
    await page.addStyleTag({
      content: `
        @page {
          size: 139.7mm 215.9mm; /* 5.5" × 8.5" in millimeters */
          margin: 0;
        }
        
        * {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        
        /* Hide any remaining UI elements */
        header, footer, nav, .navbar, .sidebar, .menu-button {
          display: none !important;
        }
        
        /* Force high-quality image rendering */
        img {
          image-rendering: high-quality;
        }
        
        /* Force high-quality text rendering */
        * {
          text-rendering: optimizeLegibility;
        }
      `
    });
    
    // Generate high-resolution PDF
    const pdf = await page.pdf({
      format: 'A5', // Similar to 5.5"×8.5" (half-letter)
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true, // Use CSS page size instead of paper size
      timeout: 60000
    });
    
    console.log('PDF generated successfully');
    
    await browser.close();
    
    // Set appropriate headers for PDF download
    setResponseHeader(event, 'Content-Type', 'application/pdf');
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="Recital_Program_${recitalId}_Print_Quality.pdf"`);
    
    // Return the PDF buffer
    return pdf;
  } catch (error) {
    console.error('PDF generation error:', error);
    return createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to generate PDF'
    });
  }
});