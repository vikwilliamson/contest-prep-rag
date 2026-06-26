import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/firebase-admin', () => ({ getAdminDb: vi.fn() }))

import { getEntries, addEntry, deleteEntry } from '../lib/entriesStore'
import { getAdminDb } from '../lib/firebase-admin'
import type { NewLogEntry } from '../lib/entries'

/** Fake Firestore admin handle for users/{uid}/logs/{date}/entries. */
function fakeDb(docs: Array<{ id: string; data: () => unknown }> = []) {
  const entryDoc = { delete: vi.fn().mockResolvedValue(undefined) }
  const entriesColl = {
    orderBy: vi.fn(() => entriesColl),
    get: vi.fn().mockResolvedValue({ docs }),
    add: vi.fn().mockResolvedValue({ id: 'new-id' }),
    doc: vi.fn(() => entryDoc),
  }
  const dateDoc = { collection: vi.fn(() => entriesColl) }
  const logsColl = { doc: vi.fn(() => dateDoc) }
  const userDoc = { collection: vi.fn(() => logsColl) }
  const usersColl = { doc: vi.fn(() => userDoc) }
  const db = { collection: vi.fn(() => usersColl) }
  return { db, entriesColl, entryDoc, usersColl, logsColl }
}

const newEntry: NewLogEntry = {
  meal: 'lunch', foodName: 'Chicken', servingDescription: '100 g', grams: 100,
  calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sodium: 74,
  potassium: 256, sugar: 0, cholesterol: 85, calcium: 15, iron: 1,
}

beforeEach(() => vi.clearAllMocks())

describe('entriesStore.getEntries', () => {
  it('returns entries for the date with their ids, without the loggedAt field', async () => {
    const { db } = fakeDb([
      { id: 'a', data: () => ({ ...newEntry, loggedAt: new Date() }) },
    ])
    vi.mocked(getAdminDb).mockResolvedValue(db as never)

    const entries = await getEntries('anonymous', '2026-06-25')

    expect(entries).toEqual([{ id: 'a', ...newEntry }])
  })
})

describe('entriesStore.addEntry', () => {
  it('writes the snapshot with a loggedAt timestamp and returns it with its id', async () => {
    const { db, entriesColl } = fakeDb()
    vi.mocked(getAdminDb).mockResolvedValue(db as never)

    const result = await addEntry('anonymous', '2026-06-25', newEntry)

    expect(entriesColl.add).toHaveBeenCalledTimes(1)
    const written = entriesColl.add.mock.calls[0][0]
    expect(written).toMatchObject(newEntry)
    expect(written.loggedAt).toBeInstanceOf(Date)
    expect(result).toEqual({ id: 'new-id', ...newEntry })
  })
})

describe('entriesStore.deleteEntry', () => {
  it('atomically deletes the single entry document', async () => {
    const { db, entriesColl, entryDoc } = fakeDb()
    vi.mocked(getAdminDb).mockResolvedValue(db as never)

    await deleteEntry('anonymous', '2026-06-25', 'abc')

    expect(entriesColl.doc).toHaveBeenCalledWith('abc')
    expect(entryDoc.delete).toHaveBeenCalledTimes(1)
  })
})
