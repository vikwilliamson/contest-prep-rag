import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import JournalPage from '../app/(app)/journal/page'

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
