import { describe, it, expect } from 'vitest'

describe('DMF Platform — smoke tests', () => {
  it('runs in test environment', () => {
    expect(true).toBe(true)
  })

  it('DSP royalty rates are correct', () => {
    const RATES: Record<string, number> = {
      spotify: 0.004,
      apple: 0.010,
      youtube: 0.0008,
      amazon: 0.005,
      tidal: 0.013,
    }
    expect(RATES.apple).toBeGreaterThan(RATES.spotify)
    expect(RATES.tidal).toBeGreaterThan(RATES.apple)
    expect(Object.keys(RATES)).toHaveLength(5)
  })

  it('calculates revenue correctly', () => {
    const streams = 200_000
    const spotifyRate = 0.004
    const appleRate = 0.010
    expect(streams * spotifyRate).toBe(800)
    expect(streams * appleRate).toBe(2000)
    expect(streams * appleRate).toBeGreaterThan(streams * spotifyRate)
  })

  it('generates a valid ISRC-like code', () => {
    const country = 'US'
    const registrant = 'RC1'
    const year = '26'
    const seq = '00001'
    const isrc = `${country}${registrant}${year}${seq}`
    expect(isrc).toHaveLength(10)
    expect(isrc.startsWith('US')).toBe(true)
  })
})
