import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/firebase-admin', () => ({
  getAdminDb: vi.fn(),
}))

import { getGoals, saveGoals } from '../lib/goalsStore'
import { getAdminDb } from '../lib/firebase-admin'

const sampleGoals = {
  calories: 2400, protein: 200, carbs: 250, fat: 70,
  fiber: 30, sodium: 2300, potassium: 3500, sugar: 50,
  cholesterol: 300, calcium: 1000, iron: 18,
}

/** Build a fake Firestore admin handle whose goals doc returns `snap`. */
function fakeDb(snap: { exists: boolean; data: () => unknown }) {
  const docRef = { get: vi.fn().mockResolvedValue(snap), set: vi.fn() }
  const journalColl = { doc: vi.fn(() => docRef) }
  const userDoc = { collection: vi.fn(() => journalColl) }
  const usersColl = { doc: vi.fn(() => userDoc) }
  return { db: { collection: vi.fn(() => usersColl) }, docRef, usersColl }
}

describe('goalsStore.getGoals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the stored goals when the document exists', async () => {
    const { db } = fakeDb({ exists: true, data: () => sampleGoals })
    vi.mocked(getAdminDb).mockResolvedValue(db as never)

    const goals = await getGoals('anonymous')

    expect(goals).toEqual(sampleGoals)
  })

  it('should return null when no goals document exists', async () => {
    const { db } = fakeDb({ exists: false, data: () => undefined })
    vi.mocked(getAdminDb).mockResolvedValue(db as never)

    const goals = await getGoals('anonymous')

    expect(goals).toBeNull()
  })
})

describe('goalsStore.saveGoals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should write the goals to the user goals document', async () => {
    const { db, docRef } = fakeDb({ exists: false, data: () => undefined })
    vi.mocked(getAdminDb).mockResolvedValue(db as never)

    await saveGoals('anonymous', sampleGoals)

    expect(docRef.set).toHaveBeenCalledWith(sampleGoals)
  })
})
