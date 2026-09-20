import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DescriptionPreview } from '@/components/admin/DescriptionPreview';

/**
 * The admin description editor's live preview must show exactly what
 * shoppers will see: narrative lines as paragraphs, "Label: value" lines as
 * bulleted specs with a bold label, and a helpful empty state before typing.
 */
describe('DescriptionPreview', () => {
  it('renders narrative lines as paragraphs', () => {
    render(<DescriptionPreview value={'First thought.\nSecond thought.'} />);
    expect(screen.getByText('First thought.')).toBeInTheDocument();
    expect(screen.getByText('Second thought.')).toBeInTheDocument();
  });

  it('renders spec lines as bullets with bold labels', () => {
    render(<DescriptionPreview value={'Story.\nMaterial: Brass\nHandmade in Alberta'} />);
    expect(screen.getByText('Material:')).toBeInTheDocument();
    expect(screen.getByText('Brass')).toBeInTheDocument();
    expect(screen.getByText('Handmade in Alberta')).toBeInTheDocument();
    // No paragraph made from the spec lines.
    expect(screen.queryByText('Material: Brass')).not.toBeInTheDocument();
  });

  it('shows the empty-state prompt before anything is typed', () => {
    render(<DescriptionPreview value="" />);
    expect(screen.getByText(/start typing above/i)).toBeInTheDocument();
  });

  it('is announced as a live region so updates are read out', () => {
    render(<DescriptionPreview value="x" />);
    expect(screen.getByLabelText(/preview of how this description/i)).toBeInTheDocument();
  });
});
