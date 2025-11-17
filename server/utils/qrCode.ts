import QRCode from 'qrcode'
import { createError } from 'h3'

/**
 * Generate a unique QR code token for a ticket
 * Format: TKT-[RANDOM_12_CHARS]-[TIMESTAMP]
 * Example: TKT-A3F9K2L8M5N1-1705432123456
 */
export function generateQRCodeToken(): string {
  const randomPart = generateRandomString(12).toUpperCase()
  const timestamp = Date.now()
  return `TKT-${randomPart}-${timestamp}`
}

/**
 * Generate QR code as a data URL (base64 PNG)
 * @param data - The data to encode in the QR code
 * @param options - QR code options
 */
export async function generateQRCodeDataURL(
  data: string,
  options?: QRCode.QRCodeToDataURLOptions
): Promise<string> {
  try {
    const defaultOptions: QRCode.QRCodeToDataURLOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
      ...options
    }

    return await QRCode.toDataURL(data, defaultOptions)
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to generate QR code: ${error.message}`
    })
  }
}

/**
 * Generate QR code as SVG string
 * @param data - The data to encode in the QR code
 */
export async function generateQRCodeSVG(data: string): Promise<string> {
  try {
    return await QRCode.toString(data, {
      type: 'svg',
      errorCorrectionLevel: 'H'
    })
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to generate QR code SVG: ${error.message}`
    })
  }
}

/**
 * Generate QR code as Buffer (PNG)
 * Useful for PDF generation
 */
export async function generateQRCodeBuffer(
  data: string,
  width: number = 300
): Promise<Buffer> {
  try {
    return await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'H',
      width,
      margin: 1
    })
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to generate QR code buffer: ${error.message}`
    })
  }
}

/**
 * Generate cryptographically secure random string
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const randomBytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(randomBytes)
    .map(byte => chars[byte % chars.length])
    .join('')
}

/**
 * Validate QR code token format
 */
export function isValidQRCodeToken(token: string): boolean {
  const pattern = /^TKT-[A-Z0-9]{12}-\d{13}$/
  return pattern.test(token)
}
