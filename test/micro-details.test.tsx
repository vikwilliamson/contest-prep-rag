import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MicroDetails from '../components/MicroDetails'

const goals = {
  calories: 2400, protein: 200, carbs: 250, fat: 70,
  fiber: 30, sodium: 2300, potassium: 3500, sugar: 50,
  cholesterol: 300, calcium: 1000, iron: 18,
}

describe('MicroDetails', () => {
  it('should be collapsed by default', () => {
    render(<MicroDetails goals={goals} />)
    expect(screen.getByRole('button', { name: /nutrition details/i })).toBeInTheDocument()
    expect(screen.queryByText('Fiber')).not.toBeInTheDocument()
  })

  it('should expand to reveal micro bars when toggled', () => {
    render(<MicroDetails goals={goals} />)
    fireEvent.click(screen.getByRole('button', { name: /nutrition details/i }))

    expect(screen.getByText('Fiber')).toBeInTheDocument()
    expect(screen.getByText('0 / 30 g')).toBeInTheDocument()
    expect(screen.getByText('0 / 2300 mg')).toBeInTheDocument() // sodium
  })

  it('should show all seven micronutrients when expanded', () => {
    render(<MicroDetails goals={goals} />)
    fireEvent.click(screen.getByRole('button', { name: /nutrition details/i }))

    for (const label of ['Fiber', 'Sodium', 'Potassium', 'Sugar', 'Cholesterol', 'Calcium', 'Iron']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })
})
