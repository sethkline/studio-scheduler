import { defineEventHandler, getQuery, createError } from 'h3'
import {
  generateQRCodeToken,
  generateQRCodeDataURL,
  generateQRCodeSVG,
  isValidQRCodeToken
} from '~/server/utils/qrCode'

/**
 * Test endpoint for QR code generation
 * GET /api/test/qr-code - Generates a unique token
 * GET /api/test/qr-code?data=custom-data - Encodes arbitrary data
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const customData = query.data as string | undefined

  try {
    // Use provided data or generate a unique token
    const dataToEncode = customData || generateQRCodeToken()
    const isGeneratedToken = !customData

    // Generate QR code as data URL (base64 PNG)
    const qrCodeDataURL = await generateQRCodeDataURL(dataToEncode)

    // Generate SVG version
    const qrCodeSVG = await generateQRCodeSVG(dataToEncode)

    return {
      success: true,
      data: dataToEncode,
      isGeneratedToken,
      isValidToken: isValidQRCodeToken(dataToEncode),
      qrCodeDataURL,
      qrCodeSVG: qrCodeSVG.substring(0, 100) + '...', // Truncate for response
      qrCodeSVGLength: qrCodeSVG.length,
      message: isGeneratedToken
        ? 'QR code generated with unique token'
        : 'QR code generated with custom data'
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to generate QR code'
    })
  }
})
