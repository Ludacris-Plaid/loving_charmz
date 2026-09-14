'use client';

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type DragEvent } from 'react';
import { uploadSiteImageAction, deleteProductImageAction } from '@/lib/admin/actions';

type Props = {
  /** The stored image URL, or null when nothing is set. */
  value: string | null;
  onChange: (url: string | null) => void;
  /** Folder inside the product-images bucket: products | collections | content */
  folder?: string;
  label?: string;
  disabled?: boolean;
};

const ACCEPT_MIME = 'image/png,image/jpeg,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Single-image picker for admin forms. Replaces every "Image URL" input:
 * the file uploads to the site's own storage and the form submits the
 * returned URL, so nothing is ever imported from an external address.
 */
export function SingleImageUpload({ value, onChange, folder = 'products', label = 'Image', disabled = false }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const [isDragOver, setIsDragOver] = useState(false);

  const upload = (file: File) => {
    if (file.size === 0) return setError('File is empty');
    if (file.size > MAX_BYTES) return setError('File too large (max 5MB)');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return setError('Unsupported type (PNG, JPEG, or WebP only)');
    }

    setError(null);
    setUploading(true);
    startTransition(async () => {
      const res = await uploadSiteImageAction(file, folder);
      setUploading(false);
      if (res.error || !res.url) {
        setError(res.error || 'Upload failed');
        return;
      }
      // Best-effort cleanup of the image being replaced.
      const previous = valueRef.current;
      if (previous) {
        startTransition(async () => {
          await deleteProductImageAction(previous);
        });
      }
      onChange(res.url);
    });
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) upload(e.target.files[0]);
    e.target.value = '';
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || uploading) return;
    if (e.dataTransfer.files?.[0]) upload(e.dataTransfer.files[0]);
  };

  const remove = () => {
    const previous = valueRef.current;
    onChange(null);
    if (previous) {
      startTransition(async () => {
        const res = await deleteProductImageAction(previous);
        if (res.error) setError(`Removed from form, but storage cleanup failed: ${res.error}`);
      });
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-ink-700">{label}</span>

      {value ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={`${label} preview`}
            className="h-28 w-28 rounded-md border border-cream-300 object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/55 to-transparent rounded-b-md py-1 opacity-0 hover:opacity-100 motion-base">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
              className="rounded-pill bg-cream-50/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-plum-800 hover:bg-cream-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={disabled || uploading}
              className="rounded-pill bg-red-600/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cream-50 hover:bg-red-700"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !uploading) setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          className={[
            'flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-6 text-center motion-base',
            disabled || uploading
              ? 'cursor-not-allowed border-cream-200 bg-cream-50 text-ink-400'
              : isDragOver
                ? 'border-plum-500 bg-plum-50 text-plum-800'
                : 'border-cream-300 bg-cream-50 text-ink-600 hover:border-plum-300 hover:bg-cream-100',
          ].join(' ')}
        >
          <span className="text-sm font-medium">
            {uploading ? 'Uploading…' : 'Drop an image here, or click to choose'}
          </span>
          <span className="text-xs text-ink-500">PNG, JPEG, or WebP · up to 5MB</span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_MIME}
            disabled={disabled || uploading}
            onChange={onInputChange}
            className="sr-only"
          />
        </label>
      )}

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
