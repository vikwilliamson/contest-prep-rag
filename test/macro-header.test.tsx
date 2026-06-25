import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MacroHeader from '../components/MacroHeader'

const goals = {
  calories: 2400, protein: 200, carbs: 250, fat: 70,
  fiber: 30, sodium: 2300, potassium: 3500, sugar: 50,
  cholesterol: 300, calcium: 1000, iron: 18,
}

describe('MacroHeader', () => {
  it('should show calories remaining equal to the goal when nothing is consumed', () => {
    render(<MacroHeader goals={goals} />)
    expect(screen.getByText('2400')).toBeInTheDocument()
    expect(screen.getByText(/calories remaining/i)).toBeInTheDocument()
  })

  it('should show each macro as consumed / target grams', () => {
    render(<MacroHeader goals={goals} />)
    expect(screen.getByText('0 / 200 g')).toBeInTheDocument() // protein
    expect(screen.getByText('0 / 250 g')).toBeInTheDocument() // carbs
    expect(screen.getByText('0 / 70 g')).toBeInTheDocument()  // fat
  })

  it('should show the read-only percent of calories for each macro', () => {
    render(<MacroHeader goals={goals} />)
    expect(screen.getByText('33%')).toBeInTheDocument() // protein 200*4/2400
    expect(screen.getByText('42%')).toBeInTheDocument() // carbs 250*4/2400
    expect(screen.getByText('26%')).toBeInTheDocument() // fat 70*9/2400
  })
})
