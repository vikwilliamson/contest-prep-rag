import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatDateKey, addDays, todayKey, isToday } from '../lib/date'

afterEach(() => vi.useRealTimers())

describe('formatDateKey', () => {
  it('should render a YYYY-MM-DD key as a human-readable weekday, day month year', () => {
    expect(formatDateKey('2026-06-23')).toBe('Tuesday, 23 June 2026')
  })
})

describe('addDays', () => {
  it('should step forward and back by one day', () => {
    expect(addDays('2026-06-23', 1)).toBe('2026-06-24')
    expect(addDays('2026-06-23', -1)).toBe('2026-06-22')
  })

  it('should roll over month and year boundaries', () => {
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('todayKey / isToday', () => {
  it('should return the local date as a YYYY-MM-DD key', () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 25, 9, 30))
    expect(todayKey()).toBe('2026-06-25')
  })

  it('should recognize only today as today', () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 25, 9, 30))
    expect(isToday('2026-06-25')).toBe(true)
    expect(isToday('2026-06-24')).toBe(false)
  })
})
