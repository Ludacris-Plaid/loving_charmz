import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProductImageUpload } from '@/components/admin/ProductImageUpload';

vi.mock('@/lib/admin/actions', () => ({
  uploadProductImageAction: vi.fn(),
  deleteProductImageAction: vi.fn(),
}));

import { uploadProductImageAction, deleteProductImageAction } from '@/lib/admin/actions';

function makeFile(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe('ProductImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an empty drop zone when value is empty', () => {
    render(<ProductImageUpload value={[]} onChange={() => {}} />);
    expect(screen.getByText(/Drop images here/)).toBeInTheDocument();
    expect(screen.getByText(/PNG, JPEG, or WebP/)).toBeInTheDocument();
  });

  it('renders existing images as thumbnails with a Primary badge on the first', () => {
    const urls = ['https://x/a.png', 'https://x/b.png'];
    render(<ProductImageUpload value={urls} onChange={() => {}} />);
    const list = screen.getByRole('list', { name: /Uploaded product images/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText('Primary')).toBeInTheDocument();
    expect(within(items[1]!).queryByText('Primary')).toBeNull();
  });

  it('uploads a selected file and adds the returned URL', async () => {
    vi.mocked(uploadProductImageAction).mockResolvedValue({ url: 'https://x/uploaded.png' });
    const onChange = vi.fn();
    render(<ProductImageUpload value={[]} onChange={onChange} />);

    const input = screen.getByTestId('product-image-input') as HTMLInputElement;
    const file = makeFile('a.png', 'image/png', 100);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadProductImageAction).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(['https://x/uploaded.png']);
    });
  });

  it('rejects an oversized file before calling the action', async () => {
    const onChange = vi.fn();
    render(<ProductImageUpload value={[]} onChange={onChange} />);
    const input = screen.getByTestId('product-image-input') as HTMLInputElement;
    const file = makeFile('big.png', 'image/png', 6 * 1024 * 1024);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Failed/)).toBeInTheDocument();
    });
    expect(uploadProductImageAction).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects an unsupported MIME type', async () => {
    render(<ProductImageUpload value={[]} onChange={() => {}} />);
    const input = screen.getByTestId('product-image-input') as HTMLInputElement;
    const file = makeFile('doc.pdf', 'application/pdf', 100);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Unsupported type/)).toBeInTheDocument();
    });
  });

  it('removes an image and calls the delete action', async () => {
    vi.mocked(deleteProductImageAction).mockResolvedValue({ success: true });
    const onChange = vi.fn();
    const urls = ['https://x/a.png', 'https://x/b.png'];
    render(<ProductImageUpload value={urls} onChange={onChange} />);

    const list = screen.getByRole('list', { name: /Uploaded product images/i });
    const items = within(list).getAllByRole('listitem');
    const removeBtn = within(items[0]!).getByRole('button', { name: /Remove image 1/ });
    fireEvent.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith(['https://x/b.png']);
    await waitFor(() => {
      expect(deleteProductImageAction).toHaveBeenCalledWith('https://x/a.png');
    });
  });

  it('set-primary moves an image to position 0', () => {
    const onChange = vi.fn();
    const urls = ['https://x/a.png', 'https://x/b.png', 'https://x/c.png'];
    render(<ProductImageUpload value={urls} onChange={onChange} />);

    const list = screen.getByRole('list', { name: /Uploaded product images/i });
    const items = within(list).getAllByRole('listitem');
    const setPrimaryBtn = within(items[2]!).getByRole('button', { name: /Set image 3 as primary/ });
    fireEvent.click(setPrimaryBtn);

    expect(onChange).toHaveBeenCalledWith(['https://x/c.png', 'https://x/a.png', 'https://x/b.png']);
  });

  it('shows an error when too many files are added at once', () => {
    render(<ProductImageUpload value={[]} onChange={() => {}} maxImages={2} />);
    const input = screen.getByTestId('product-image-input') as HTMLInputElement;
    const files = [
      makeFile('a.png', 'image/png', 100),
      makeFile('b.png', 'image/png', 100),
      makeFile('c.png', 'image/png', 100),
    ];
    fireEvent.change(input, { target: { files } });

    expect(screen.getByRole('alert').textContent).toMatch(/Only 2 more/);
    expect(uploadProductImageAction).not.toHaveBeenCalled();
  });
});
