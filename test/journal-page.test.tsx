import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import JournalPage from '../app/(app)/journal/page'
import { todayKey, addDays, formatDateKey } from '../lib/date'

const goals = {
  calories: 2400, protein: 200, carbs: 250, fat: 70,
  fiber: 30, sodium: 2300, potassium: 3500, sugar: 50,
  cholesterol: 300, calcium: 1000, iron: 18,
}

const getResponse = (g: unknown) => ({ ok: true, json: async () => ({ goals: g }) })

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('JournalPage', () => {
  it('should show the onboarding goals modal when no goals exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(getResponse(null)))
    render(<JournalPage />)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Calories')).toBeInTheDocument()
    // onboarding cannot be dismissed
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('should show the journal with macro header and meal sections when goals exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(getResponse(goals)))
    render(<JournalPage />)

    expect(await screen.findByText(/calories remaining/i)).toBeInTheDocument()
    for (const meal of ['Breakfast', 'Lunch', 'Dinner', 'Snacks']) {
      expect(screen.getByText(meal)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /goals/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should open a pre-populated, dismissible edit modal from the Goals button', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(getResponse(goals)))
    render(<JournalPage />)
    await screen.findByText(/calories remaining/i)

    fireEvent.click(screen.getByRole('button', { name: /goals/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Calories')).toHaveValue(2400)
  })

  it('should PUT the goals and close the modal when the edit is saved', async () => {
    const fetchMock = vi.fn((_url: string, opts?: RequestInit) => {
      if (opts?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: async () => ({ goals }) })
      }
      return Promise.resolve(getResponse(goals))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<JournalPage />)
    await screen.findByText(/calories remaining/i)

    fireEvent.click(screen.getByRole('button', { name: /goals/i }))
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      const put = fetchMock.mock.calls.find(([, o]) => o?.method === 'PUT')
      expect(put).toBeDefined()
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})

describe('JournalPage date navigation', () => {
  const stubGoals = () =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(getResponse(goals)))

  it('opens to today and disables the forward arrow', async () => {
    stubGoals()
    render(<JournalPage />)
    await screen.findByText(/calories remaining/i)

    expect(screen.getByText(formatDateKey(todayKey()))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next day/i })).toBeDisabled()
  })

  it('steps back a day and re-enables the forward arrow', async () => {
    stubGoals()
    render(<JournalPage />)
    await screen.findByText(/calories remaining/i)

    fireEvent.click(screen.getByRole('button', { name: /previous day/i }))

    expect(
      screen.getByText(formatDateKey(addDays(todayKey(), -1)))
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next day/i })).toBeEnabled()
  })

  it('steps forward back to today and re-disables the forward arrow', async () => {
    stubGoals()
    render(<JournalPage />)
    await screen.findByText(/calories remaining/i)

    fireEvent.click(screen.getByRole('button', { name: /previous day/i }))
    fireEvent.click(screen.getByRole('button', { name: /next day/i }))

    expect(screen.getByText(formatDateKey(todayKey()))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next day/i })).toBeDisabled()
  })

  it('opens a calendar picker when the date label is tapped', async () => {
    stubGoals()
    render(<JournalPage />)
    await screen.findByText(/calories remaining/i)

    expect(screen.queryByLabelText('Pick a date')).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: formatDateKey(todayKey()) })
    )
    expect(screen.getByLabelText('Pick a date')).toBeInTheDocument()
  })

  it('jumps to a date selected from the calendar and closes the picker', async () => {
    stubGoals()
    render(<JournalPage />)
    await screen.findByText(/calories remaining/i)

    fireEvent.click(
      screen.getByRole('button', { name: formatDateKey(todayKey()) })
    )
    fireEvent.change(screen.getByLabelText('Pick a date'), {
      target: { value: '2026-03-15' },
    })

    expect(screen.getByText(formatDateKey('2026-03-15'))).toBeInTheDocument()
    expect(screen.queryByLabelText('Pick a date')).not.toBeInTheDocument()
  })

  it('shows empty meal sections and zero-consumed bars on a navigated date', async () => {
    stubGoals()
    render(<JournalPage />)
    await screen.findByText(/calories remaining/i)

    fireEvent.click(screen.getByRole('button', { name: /previous day/i }))

    for (const meal of ['Breakfast', 'Lunch', 'Dinner', 'Snacks']) {
      expect(screen.getByText(meal)).toBeInTheDocument()
    }
    // full target remains: nothing consumed on a day with no entries
    expect(screen.getByText(String(goals.calories))).toBeInTheDocument()
    expect(screen.getByText(`0 / ${goals.protein} g`)).toBeInTheDocument()
  })
})

describe('JournalPage food entries', () => {
  const egg = {
    id: 'egg1', meal: 'breakfast', foodName: 'Eggs',
    servingDescription: '2 large (100g)', grams: 100,
    calories: 200, protein: 12, carbs: 1, fat: 15, fiber: 0, sodium: 140,
    potassium: 130, sugar: 1, cholesterol: 370, calcium: 50, iron: 1.5,
  }
  const grouped = (entries: Record<string, unknown[]>) => ({
    ok: true,
    json: async () => ({
      entries: { breakfast: [], lunch: [], dinner: [], snacks: [], ...entries },
    }),
  })
  const chickenResult = {
    id: 'usda-1', source: 'usda', foodName: 'Chicken breast',
    calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sodium: 74,
    potassium: 256, sugar: 0, cholesterol: 85, calcium: 15, iron: 1,
    portions: [{ label: 'grams', grams: 1 }],
  }

  // Route the global fetch mock by URL + method.
  function routeFetch(
    handlers: { entriesGet?: unknown; postEntry?: unknown; search?: unknown } = {}
  ) {
    const fetchMock = vi.fn((url: string, opts?: RequestInit) => {
      if (url === '/api/journal/goals') return Promise.resolve(getResponse(goals))
      if (url.includes('/food-search'))
        return Promise.resolve(handlers.search ?? { ok: true, json: async () => ({ results: [chickenResult] }) })
      if (url.includes('/entries') && opts?.method === 'POST')
        return Promise.resolve(handlers.postEntry)
      if (url.includes('/entries') && opts?.method === 'DELETE')
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) })
      if (url.includes('/entries'))
        return Promise.resolve(handlers.entriesGet ?? grouped({}))
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('loads the day entries and reflects them in the section and progress', async () => {
    routeFetch({ entriesGet: grouped({ breakfast: [egg] }) })
    render(<JournalPage />)
    await screen.findByText(/calories remaining/i)

    expect(await screen.findByText('Eggs')).toBeInTheDocument()
    expect(screen.getByText('2 large (100g)')).toBeInTheDocument()
    // calories remaining: 2400 - 200 = 2200; protein bar 12 / 200 g
    expect(screen.getByText('2200')).toBeInTheDocument()
    expect(screen.getByText('12 / 200 g')).toBeInTheDocument()
  })

  it('refetches entries when the date changes', async () => {
    const fetchMock = routeFetch()
    render(<JournalPage />)
    await screen.findByText(/calories remaining/i)

    fireEvent.click(screen.getByRole('button', { name: /previous day/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/journal/${addDays(todayKey(), -1)}/entries`
      )
    )
  })

  it('adds a food through the modal and updates progress without reload', async () => {
    routeFetch({
      postEntry: {
        ok: true,
        json: async () => ({
          entry: {
            id: 'new', meal: 'lunch', foodName: 'Chicken breast',
            servingDescription: '200 g', grams: 200,
            calories: 330, protein: 62, carbs: 0, fat: 7.2, fiber: 0,
            sodium: 148, potassium: 512, sugar: 0, cholesterol: 170,
            calcium: 30, iron: 2,
          },
        }),
      },
    })
    render(<JournalPage />)
    await screen.findByText(/calories remaining/i)

    fireEvent.click(screen.getByRole('button', { name: /add food to lunch/i }))
    fireEvent.change(screen.getByLabelText(/search foods/i), {
      target: { value: 'chicken' },
    })
    fireEvent.submit(screen.getByRole('search'))
    fireEvent.click(await screen.findByRole('button', { name: /chicken breast/i }))
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

    expect(await screen.findByText('Chicken breast')).toBeInTheDocument()
    // 2400 - 330 = 2070
    await waitFor(() => expect(screen.getByText('2070')).toBeInTheDocument())
  })

  it('removes an entry and restores progress', async () => {
    routeFetch({ entriesGet: grouped({ breakfast: [egg] }) })
    render(<JournalPage />)
    await screen.findByText('Eggs')
    expect(screen.getByText('2200')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /remove eggs/i }))

    await waitFor(() =>
      expect(screen.queryByText('Eggs')).not.toBeInTheDocument()
    )
    expect(screen.getByText('2400')).toBeInTheDocument()
  })
})
