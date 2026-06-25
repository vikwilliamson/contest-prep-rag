import { describe, it, expect } from 'vitest'
import { parseGoals } from '../lib/goals'

const valid = {
  calories: 2400, protein: 200, carbs: 250, fat: 70,
  fiber: 30, sodium: 2300, potassium: 3500, sugar: 50,
  cholesterol: 300, calcium: 1000, iron: 18,
}

describe('parseGoals', () => {
  it('should return the normalized goals for a valid payload', () => {
    expect(parseGoals(valid)).toEqual(valid)
  })

  it('should strip unknown fields', () => {
    expect(parseGoals({ ...valid, hacker: 1 })).toEqual(valid)
  })

  it('should return null when a field is missing', () => {
    const missing: Partial<typeof valid> = { ...valid }
    delete missing.iron
    expect(parseGoals(missing)).toBeNull()
  })

  it('should return null when a field is not a number', () => {
    expect(parseGoals({ ...valid, protein: '200' })).toBeNull()
  })

  it('should return null for a negative value', () => {
    expect(parseGoals({ ...valid, fat: -1 })).toBeNull()
  })

  it('should return null for non-object input', () => {
    expect(parseGoals(null)).toBeNull()
    expect(parseGoals('nope')).toBeNull()
  })
})
