import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from '../../components/ui/Card'
import React from 'react'

describe('Card Component', () => {
    it('renders the title when provided', () => {
        render(<Card title="Test Title"><div>Content</div></Card>)
        expect(screen.getByText('Test Title')).toBeInTheDocument()
    })

    it('renders children correctly', () => {
        render(<Card><div>Child Content</div></Card>)
        expect(screen.getByText('Child Content')).toBeInTheDocument()
    })

    it('applies custom className', () => {
        const { container } = render(<Card className="custom-class"><div>Content</div></Card>)
        expect(container.firstChild).toHaveClass('custom-class')
    })
})
