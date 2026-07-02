import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SavedMealsModal from '../components/SavedMealsModal'

// authFetch delegates to the (stubbed) global fetch — token attachment is
// covered in auth-fetch.test.ts.
vi.mock('../lib/authFetch', () => ({
  authFetch: (...args: Parameters<typeof fetch>) => fetch(...args),
}))

const meal = { id: 'a', name: 'Breakky' }
const food = {
  id: 'f1', foodName: 'Oats', servingDescription: '1 × 1 cup (90g)', grams: 90,
  calories: 350, protein: 15, carbs: 59, fat: 6, fiber: 10,
  sodium: 5, potassium: 386, sugar: 1, cholesterol: 0, calcium: 49, iron: 5,
}

function fetchRouter(overrides: Record<string, unknown> = {}) {
  return vi.fn((url: string, opts?: RequestInit) => {
    if (url === '/api/journal/saved-meals' && !opts?.method)
      return Promise.resolve({ ok: true, json: async () => ({ meals: [meal], ...overrides.list }) })
    if (url === '/api/journal/saved-meals' && opts?.method === 'POST')
      return Promise.resolve({ ok: true, json: async () => ({ meal: overrides.created ?? { id: 'new', name: 'New meal' } }) })
    if (url.includes('/saved-meals/') && opts?.method === 'PATCH')
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) })
    if (url.includes('/saved-meals/') && !url.includes('/foods') && opts?.method === 'DELETE')
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) })
    if (url.includes('/foods') && !opts?.method)
      return Promise.resolve({ ok: true, json: async () => ({ foods: overrides.foods ?? [food] }) })
    if (url.includes('/foods') && opts?.method === 'POST')
      return Promise.resolve({ ok: true, json: async () => ({ food: overrides.addedFood ?? food }) })
    if (url.includes('/foods/') && opts?.method === 'DELETE')
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) })
    return Promise.reject(new Error(`unexpected fetch: ${url} ${opts?.method ?? 'GET'}`))
  })
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('SavedMealsModal — list and create', () => {
  it('loads and displays saved meals', async () => {
    vi.stubGlobal('fetch', fetchRouter())
    render(<SavedMealsModal onClose={vi.fn()} />)

    expect(await screen.findByText('Breakky')).toBeInTheDocument()
  })

  it('creates a new saved meal and adds it to the list', async () => {
    vi.stubGlobal('fetch', fetchRouter({ created: { id: 'new', name: 'Lunch prep' } }))
    render(<SavedMealsModal onClose={vi.fn()} />)
    await screen.findByText('Breakky')

    fireEvent.change(screen.getByLabelText(/new meal name/i), {
      target: { value: 'Lunch prep' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create meal/i }))

    expect(await screen.findByText('Lunch prep')).toBeInTheDocument()
  })
})

describe('SavedMealsModal — rename and delete', () => {
  it('renames a meal inline', async () => {
    vi.stubGlobal('fetch', fetchRouter())
    render(<SavedMealsModal onClose={vi.fn()} />)
    await screen.findByText('Breakky')

    fireEvent.click(screen.getByRole('button', { name: /rename breakky/i }))
    const input = screen.getByDisplayValue('Breakky')
    fireEvent.change(input, { target: { value: 'Morning stack' } })
    fireEvent.click(screen.getByRole('button', { name: /save rename/i }))

    await waitFor(() => expect(screen.getByText('Morning stack')).toBeInTheDocument())
  })

  it('deletes a meal and removes it from the list', async () => {
    vi.stubGlobal('fetch', fetchRouter())
    render(<SavedMealsModal onClose={vi.fn()} />)
    await screen.findByText('Breakky')

    fireEvent.click(screen.getByRole('button', { name: /delete breakky/i }))

    await waitFor(() => expect(screen.queryByText('Breakky')).not.toBeInTheDocument())
  })
})

describe('SavedMealsModal — food management', () => {
  it('shows the foods when a meal is expanded', async () => {
    vi.stubGlobal('fetch', fetchRouter())
    render(<SavedMealsModal onClose={vi.fn()} />)
    await screen.findByText('Breakky')

    fireEvent.click(screen.getByRole('button', { name: /expand breakky/i }))

    expect(await screen.findByText('Oats')).toBeInTheDocument()
  })

  it('removes a food from the meal', async () => {
    vi.stubGlobal('fetch', fetchRouter())
    render(<SavedMealsModal onClose={vi.fn()} />)
    await screen.findByText('Breakky')
    fireEvent.click(screen.getByRole('button', { name: /expand breakky/i }))
    await screen.findByText('Oats')

    fireEvent.click(screen.getByRole('button', { name: /remove oats/i }))

    await waitFor(() => expect(screen.queryByText('Oats')).not.toBeInTheDocument())
  })
})
