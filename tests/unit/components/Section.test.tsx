import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Section } from '@/components/ui/Section';

describe('Section', () => {
  it('renders children', () => {
    render(<Section><p>Section content</p></Section>);
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });

  it('renders as a section by default', () => {
    const { container } = render(<Section>Content</Section>);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('renders as a custom tag when specified', () => {
    const { container } = render(<Section as="main">Content</Section>);
    expect(container.querySelector('main')).toBeInTheDocument();
  });

  it('accepts additional className', () => {
    render(<Section className="custom-section" data-testid="section">Content</Section>);
    const el = screen.getByTestId('section');
    expect(el.className).toContain('custom-section');
  });
});