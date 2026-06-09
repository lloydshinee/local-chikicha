import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardComponent } from './CardComponent';

describe('CardComponent', () => {
  it('renders face-up card with correct alt text', () => {
    render(<CardComponent card={{ suit: 'spades', rank: 'A' }} />);
    expect(screen.getByAltText('A of spades')).toBeInTheDocument();
  });

  it('renders face-down card', () => {
    render(<CardComponent card={{ suit: 'hearts', rank: 'K' }} faceDown />);
    expect(screen.getByAltText('Card back')).toBeInTheDocument();
  });

  it('applies selected styling', () => {
    const { container } = render(
      <CardComponent
        card={{ suit: 'diamonds', rank: '10' }}
        selected
        playerColor="#EF4444"
      />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.style.transform).toBe('translateY(-10px)');
  });
});
