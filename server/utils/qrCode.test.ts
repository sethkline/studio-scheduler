import { describe, it, expect } from 'vitest'
import {
  generateQRCodeToken,
  isValidQRCodeToken,
  generateQRCodeDataURL,
  generateQRCodeSVG,
  generateQRCodeBuffer
} from './qrCode'

describe('QR Code Utilities', () => {
  describe('generateQRCodeToken', () => {
    it('generates token in correct format', () => {
      const token = generateQRCodeToken()
      expect(token).toMatch(/^TKT-[A-Z0-9]{12}-\d{13}$/)
    })

    it('generates unique tokens', () => {
      const token1 = generateQRCodeToken()
      const token2 = generateQRCodeToken()
      expect(token1).not.toBe(token2)
    })

    it('includes timestamp', () => {
      const token = generateQRCodeToken()
      const parts = token.split('-')
      const timestamp = parseInt(parts[2])
      const now = Date.now()
      expect(timestamp).toBeGreaterThan(now - 1000) // Within last second
      expect(timestamp).toBeLessThanOrEqual(now)
    })

    it('includes random alphanumeric characters', () => {
      const token = generateQRCodeToken()
      const parts = token.split('-')
      const randomPart = parts[1]
      expect(randomPart).toHaveLength(12)
      expect(randomPart).toMatch(/^[A-Z0-9]{12}$/)
    })
  })

  describe('isValidQRCodeToken', () => {
    it('validates correct token format', () => {
      const token = generateQRCodeToken()
      expect(isValidQRCodeToken(token)).toBe(true)
    })

    it('rejects invalid formats', () => {
      expect(isValidQRCodeToken('invalid')).toBe(false)
      expect(isValidQRCodeToken('TKT-123-456')).toBe(false)
      expect(isValidQRCodeToken('TKT-ABCD-1234567890123')).toBe(false)
      expect(isValidQRCodeToken('TKT-ABCDEFGHIJKL-12345678901')).toBe(false) // timestamp too short
      expect(isValidQRCodeToken('TKT-ABCDEFGHIJK-1234567890123')).toBe(false) // random part too short
    })

    it('rejects tokens with lowercase characters', () => {
      expect(isValidQRCodeToken('TKT-abcdefghijkl-1234567890123')).toBe(false)
    })

    it('rejects tokens with special characters', () => {
      expect(isValidQRCodeToken('TKT-ABC!@#$%^&*(-1234567890123')).toBe(false)
    })
  })

  describe('generateQRCodeDataURL', () => {
    it('generates valid data URL', async () => {
      const dataURL = await generateQRCodeDataURL('test-data')
      expect(dataURL).toMatch(/^data:image\/png;base64,/)
    })

    it('includes provided data', async () => {
      const token = 'TKT-ABC123XYZ456-1234567890123'
      const dataURL = await generateQRCodeDataURL(token)
      expect(dataURL).toBeTruthy()
      expect(dataURL.length).toBeGreaterThan(100)
    })

    it('generates different QR codes for different data', async () => {
      const dataURL1 = await generateQRCodeDataURL('data1')
      const dataURL2 = await generateQRCodeDataURL('data2')
      expect(dataURL1).not.toBe(dataURL2)
    })

    it('respects custom options', async () => {
      const dataURL = await generateQRCodeDataURL('test', {
        width: 500,
        margin: 2
      })
      expect(dataURL).toMatch(/^data:image\/png;base64,/)
      // Larger width should produce a larger data URL
      const smallDataURL = await generateQRCodeDataURL('test', { width: 100 })
      expect(dataURL.length).toBeGreaterThan(smallDataURL.length)
    })
  })

  describe('generateQRCodeSVG', () => {
    it('generates valid SVG', async () => {
      const svg = await generateQRCodeSVG('test-data')
      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
    })

    it('generates different SVGs for different data', async () => {
      const svg1 = await generateQRCodeSVG('data1')
      const svg2 = await generateQRCodeSVG('data2')
      expect(svg1).not.toBe(svg2)
    })

    it('includes viewBox attribute', async () => {
      const svg = await generateQRCodeSVG('test')
      expect(svg).toContain('viewBox')
    })
  })

  describe('generateQRCodeBuffer', () => {
    it('generates buffer', async () => {
      const buffer = await generateQRCodeBuffer('test-data')
      expect(Buffer.isBuffer(buffer)).toBe(true)
      expect(buffer.length).toBeGreaterThan(0)
    })

    it('respects width parameter', async () => {
      const buffer1 = await generateQRCodeBuffer('test', 200)
      const buffer2 = await generateQRCodeBuffer('test', 400)
      // Larger width should produce larger file
      expect(buffer2.length).toBeGreaterThan(buffer1.length)
    })

    it('uses default width if not specified', async () => {
      const buffer = await generateQRCodeBuffer('test')
      expect(Buffer.isBuffer(buffer)).toBe(true)
      expect(buffer.length).toBeGreaterThan(0)
    })

    it('generates different buffers for different data', async () => {
      const buffer1 = await generateQRCodeBuffer('data1')
      const buffer2 = await generateQRCodeBuffer('data2')
      expect(buffer1).not.toEqual(buffer2)
    })
  })
})
