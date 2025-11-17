import { defineEventHandler, getQuery, createError } from 'h3'
import {
  generateQRCodeToken,
  generateQRCodeDataURL,
  generateQRCodeSVG,
  isValidQRCodeToken
} from '~/server/utils/qrCode'

/**
 * Test endpoint for QR code generation
 * GET /api/test/qr-code?data=optional-test-data
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const data = (query.data as string) || 'Test QR Code'

  try {
    // Generate unique token
    const token = generateQRCodeToken()

    // Generate QR code as data URL (base64 PNG)
    const qrCodeDataURL = await generateQRCodeDataURL(token)

    // Generate SVG version
    const qrCodeSVG = await generateQRCodeSVG(token)

    return {
      success: true,
      token,
      isValid: isValidQRCodeToken(token),
      qrCodeDataURL,
      qrCodeSVG: qrCodeSVG.substring(0, 100) + '...', // Truncate for response
      qrCodeSVGLength: qrCodeSVG.length,
      message: 'QR code generated successfully'
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to generate QR code'
    })
  }
})
