import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/firebase-admin', () => ({ getAdminDb: vi.fn() }))

import {
  listSavedMeals,
  createSavedMeal,
  renameSavedMeal,
  deleteSavedMeal,
  listSavedMealFoods,
  addSavedMealFood,
  deleteSavedMealFood,
} from '../lib/savedMealsStore'
import { getAdminDb } from '../lib/firebase-admin'
import type { NewSavedMealFood } from '../lib/savedMeals'

const newFood: NewSavedMealFood = {
  foodName: 'Oats', servingDescription: '100 g', grams: 100,
  calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11,
  sodium: 6, potassium: 429, sugar: 1, cholesterol: 0, calcium: 54, iron: 5,
}

/** Fake Firestore handle scoped to users/{uid}/savedMeals */
function fakeDb(mealDocs: Array<{ id: string; data: () => unknown }> = [], foodDocs: Array<{ id: string; data: () => unknown }> = []) {
  const foodDoc = { delete: vi.fn().mockResolvedValue(undefined) }
  const foodsColl = {
    get: vi.fn().mockResolvedValue({ docs: foodDocs }),
    add: vi.fn().mockResolvedValue({ id: 'food-new' }),
    doc: vi.fn(() => foodDoc),
  }
  const mealDoc = {
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    collection: vi.fn(() => foodsColl),
  }
  const savedMealsColl = {
    get: vi.fn().mockResolvedValue({ docs: mealDocs }),
    add: vi.fn().mockResolvedValue({ id: 'meal-new' }),
    doc: vi.fn(() => mealDoc),
  }
  const userDoc = { collection: vi.fn(() => savedMealsColl) }
  const usersColl = { doc: vi.fn(() => userDoc) }
  const db = { collection: vi.fn(() => usersColl) }
  return { db, savedMealsColl, mealDoc, foodsColl, foodDoc }
}

beforeEach(() => vi.clearAllMocks())

describe('listSavedMeals', () => {
  it('returns saved meals with id and name', async () => {
    const { db } = fakeDb([
      { id: 'a', data: () => ({ name: 'Breakky' }) },
      { id: 'b', data: () => ({ name: 'Post-workout' }) },
    ])
    vi.mocked(getAdminDb).mockResolvedValue(db as never)

    const meals = await listSavedMeals('anonymous')

    expect(meals).toEqual([
      { id: 'a', name: 'Breakky' },
      { id: 'b', name: 'Post-workout' },
    ])
  })
})

describe('createSavedMeal', () => {
  it('writes a new saved meal document and returns it with its id', async () => {
    const { db, savedMealsColl } = fakeDb()
    vi.mocked(getAdminDb).mockResolvedValue(db as never)

    const result = await createSavedMeal('anonymous', 'Lunch prep')

    expect(savedMealsColl.add).toHaveBeenCalledTimes(1)
    const written = savedMealsColl.add.mock.calls[0][0]
    expect(written.name).toBe('Lunch prep')
    expect(written.createdAt).toBeInstanceOf(Date)
    expect(result).toEqual({ id: 'meal-new', name: 'Lunch prep' })
  })
})

describe('renameSavedMeal', () => {
  it('updates only the name field', async () => {
    const { db, savedMealsColl, mealDoc } = fakeDb()
    vi.mocked(getAdminDb).mockResolvedValue(db as never)

    await renameSavedMeal('anonymous', 'abc', 'New name')

    expect(savedMealsColl.doc).toHaveBeenCalledWith('abc')
    expect(mealDoc.update).toHaveBeenCalledWith({ name: 'New name' })
  })
})

describe('deleteSavedMeal', () => {
  it('deletes the meal document', async () => {
    const { db, savedMealsColl, mealDoc } = fakeDb()
    vi.mocked(getAdminDb).mockResolvedValue(db as never)

    await deleteSavedMeal('anonymous', 'abc')

    expect(savedMealsColl.doc).toHaveBeenCalledWith('abc')
    expect(mealDoc.delete).toHaveBeenCalledTimes(1)
  })
})

describe('listSavedMealFoods', () => {
  it('returns all foods in the subcollection with their ids', async () => {
    const { db } = fakeDb([], [
      { id: 'f1', data: () => newFood },
    ])
    vi.mocked(getAdminDb).mockResolvedValue(db as never)

    const foods = await listSavedMealFoods('anonymous', 'abc')

    expect(foods).toEqual([{ id: 'f1', ...newFood }])
  })
})

describe('addSavedMealFood', () => {
  it('writes the food snapshot and returns it with its id', async () => {
    const { db, foodsColl } = fakeDb()
    vi.mocked(getAdminDb).mockResolvedValue(db as never)

    const result = await addSavedMealFood('anonymous', 'abc', newFood)

    expect(foodsColl.add).toHaveBeenCalledWith(newFood)
    expect(result).toEqual({ id: 'food-new', ...newFood })
  })
})

describe('deleteSavedMealFood', () => {
  it('atomically deletes the single food document', async () => {
    const { db, foodsColl, foodDoc } = fakeDb()
    vi.mocked(getAdminDb).mockResolvedValue(db as never)

    await deleteSavedMealFood('anonymous', 'abc', 'f1')

    expect(foodsColl.doc).toHaveBeenCalledWith('f1')
    expect(foodDoc.delete).toHaveBeenCalledTimes(1)
  })
})
