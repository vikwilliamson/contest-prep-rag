import { describe, it, expect } from 'vitest'
import { computeEntry, sumConsumed } from '../lib/entries'
import type { FoodResult } from '../lib/foodSearch'

const food: FoodResult = {
  id: 'usda-1',
  source: 'usda',
  foodName: 'Chicken breast',
  calories: 165,
  protein: 31,
  carbs: 0,
  fat: 3.6,
  fiber: 0,
  sodium: 74,
  potassium: 256,
  sugar: 0,
  cholesterol: 85,
  calcium: 15,
  iron: 1,
  portions: [
    { label: '1 cup', grams: 140 },
    { label: 'grams', grams: 1 },
  ],
}

describe('computeEntry', () => {
  it('scales every nutrient by (portionGrams / 100) * quantity', () => {
    // 1 cup (140g) * 1.5 = 210g -> scale 2.1
    const entry = computeEntry({
      food,
      meal: 'lunch',
      portion: { label: '1 cup', grams: 140 },
      quantity: 1.5,
    })

    expect(entry).toMatchObject({
      meal: 'lunch',
      foodName: 'Chicken breast',
      servingDescription: '1.5 × 1 cup (210g)',
      grams: 210,
      calories: 346.5, // 165 * 2.1
      protein: 65.1, // 31 * 2.1
      fat: 7.6, // 3.6 * 2.1 = 7.56 -> 7.6
      sodium: 155.4, // 74 * 2.1
      cholesterol: 178.5, // 85 * 2.1
    })
  })

  it('uses a plain gram description and treats null micros as 0', () => {
    const offFood: FoodResult = {
      ...food,
      potassium: null,
      cholesterol: null,
      iron: null,
    }
    const entry = computeEntry({
      food: offFood,
      meal: 'snacks',
      portion: { label: 'grams', grams: 1 },
      quantity: 200,
    })

    expect(entry.servingDescription).toBe('200 g')
    expect(entry.grams).toBe(200)
    expect(entry.calories).toBe(330) // 165 * 2
    expect(entry.potassium).toBe(0) // null micro -> 0 in the snapshot
    expect(entry.iron).toBe(0)
  })
})

describe('sumConsumed', () => {
  it('totals every nutrient field across entries', () => {
    const base = { id: 'x', meal: 'lunch' as const, foodName: 'f', servingDescription: 's', grams: 100 }
    const e1 = { ...base, calories: 100, protein: 10, carbs: 5, fat: 2, fiber: 1, sodium: 50, potassium: 20, sugar: 3, cholesterol: 10, calcium: 5, iron: 1 }
    const e2 = { ...base, calories: 200, protein: 20, carbs: 10, fat: 4, fiber: 2, sodium: 100, potassium: 40, sugar: 6, cholesterol: 20, calcium: 10, iron: 2 }

    expect(sumConsumed([e1, e2])).toMatchObject({
      calories: 300, protein: 30, carbs: 15, fat: 6, fiber: 3,
      sodium: 150, potassium: 60, sugar: 9, cholesterol: 30, calcium: 15, iron: 3,
    })
  })

  it('returns all-zero totals for an empty log', () => {
    expect(sumConsumed([])).toMatchObject({ calories: 0, protein: 0, iron: 0 })
  })
})
