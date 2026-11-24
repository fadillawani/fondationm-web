import { describe, expect, it } from 'vitest'
import { ACCESS_CODE_ALPHABET, ACCESS_CODE_LENGTH, generateAccessCode } from './accessCode'

describe('generateAccessCode', () => {
  it('produit 8 caractères de l’alphabet sans ambiguïté', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateAccessCode()
      expect(code).toHaveLength(ACCESS_CODE_LENGTH)
      expect([...code].every((char) => ACCESS_CODE_ALPHABET.includes(char))).toBe(true)
    }
    expect(ACCESS_CODE_ALPHABET).not.toMatch(/[0O1IL]/)
  })

  it('rejette les octets qui biaiseraient le tirage', () => {
    // 248 = 256 - (256 % 31) : les octets 248 à 255 sont écartés.
    const bytes = [255, 248, 0, 1, 2, 3, 4, 5, 6, 7]
    const code = generateAccessCode((buffer) => {
      buffer.set(bytes.slice(0, buffer.length).concat(Array(Math.max(0, buffer.length - bytes.length)).fill(30)))
      return buffer
    })
    expect(code).toBe('ABCDEFGH')
  })

  it('ne produit pas deux fois le même code de suite', () => {
    expect(generateAccessCode()).not.toBe(generateAccessCode())
  })
})
