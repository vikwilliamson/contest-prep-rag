import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GoalsModal from '../components/GoalsModal'

const goals = {
  calories: 2400, protein: 200, carbs: 250, fat: 70,
  fiber: 30, sodium: 2300, potassium: 3500, sugar: 50,
  cholesterol: 300, calcium: 1000, iron: 18,
}

const LABELS = ['Calories', 'Protein', 'Carbs', 'Fat', 'Fiber', 'Sodium',
  'Potassium', 'Sugar', 'Cholesterol', 'Calcium', 'Iron']

describe('GoalsModal', () => {
  it('should render all eleven goal fields', () => {
    render(<GoalsModal onSave={vi.fn()} />)
    for (const label of LABELS) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
  })

  it('should pre-populate fields from the initial goals', () => {
    render(<GoalsModal initial={goals} onSave={vi.fn()} />)
    expect(screen.getByLabelText('Calories')).toHaveValue(2400)
    expect(screen.getByLabelText('Protein')).toHaveValue(200)
    expect(screen.getByLabelText('Iron')).toHaveValue(18)
  })

  it('should call onSave with the parsed goals when submitted', () => {
    const onSave = vi.fn()
    render(<GoalsModal initial={goals} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalledWith(goals)
  })

  it('should not save and should show an error when a field is left empty', () => {
    const onSave = vi.fn()
    render(<GoalsModal initial={goals} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Calories'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('should not offer a cancel button by default (onboarding cannot be dismissed)', () => {
    render(<GoalsModal onSave={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('should offer a cancel button when dismissible and call onClose', () => {
    const onClose = vi.fn()
    render(<GoalsModal initial={goals} onSave={vi.fn()} dismissible onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
