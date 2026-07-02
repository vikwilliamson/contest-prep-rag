import { describe, it, expect } from 'vitest'
import {
  parseSavedMealFoodInput,
  computeSavedMealFood,
} from '../lib/savedMeals'

const food = {
  id: 'usda-1', source: 'usda', foodName: 'Oats',
  calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, sodium: 6,
  potassium: 429, sugar: 1, cholesterol: 0, calcium: 54, iron: 5,
  portions: [
    { label: '1 cup', grams: 90 },
    { label: 'grams', grams: 1 },
  ],
}

describe('parseSavedMealFoodInput', () => {
  it('accepts a valid payload', () => {
    const result = parseSavedMealFoodInput({
      food,
      portion: { label: '1 cup', grams: 90 },
      quantity: 1,
    })
    expect(result).not.toBeNull()
    expect(result?.food.foodName).toBe('Oats')
  })

  it('rejects a missing food', () => {
    expect(parseSavedMealFoodInput({ portion: { label: 'grams', grams: 1 }, quantity: 1 })).toBeNull()
  })

  it('rejects a non-positive quantity', () => {
    expect(parseSavedMealFoodInput({ food, portion: { label: 'grams', grams: 1 }, quantity: 0 })).toBeNull()
  })

  it('rejects a non-positive portion grams', () => {
    expect(parseSavedMealFoodInput({ food, portion: { label: 'grams', grams: 0 }, quantity: 1 })).toBeNull()
  })
})

describe('computeSavedMealFood', () => {
  it('computes a full nutrient snapshot scaled by portion × quantity', () => {
    const result = computeSavedMealFood({
      food,
      portion: { label: 'grams', grams: 1 },
      quantity: 100,
    })
    expect(result.foodName).toBe('Oats')
    expect(result.grams).toBe(100)
    expect(result.calories).toBe(389)
    expect(result.protein).toBe(17)
    expect(result.servingDescription).toBe('100 g')
    // no meal or loggedAt on the stored food document
    expect(result).not.toHaveProperty('meal')
    expect(result).not.toHaveProperty('loggedAt')
  })

  it('builds a readable serving description for named portions', () => {
    const result = computeSavedMealFood({
      food,
      portion: { label: '1 cup', grams: 90 },
      quantity: 1.5,
    })
    expect(result.servingDescription).toBe('1.5 × 1 cup (135g)')
    expect(result.grams).toBe(135)
  })
})
