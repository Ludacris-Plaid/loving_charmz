'use client';

import { useCallback, useEffect, useRef, useState, useTransition, type ChangeEvent, type DragEvent } from 'react';
import { uploadProductImageAction, deleteProductImageAction } from '@/lib/admin/actions';

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  productSlug?: string;
  disabled?: boolean;
  maxImages?: number;
};

type PendingImage = {
  id: string;
  previewUrl: string;
  name: string;
  status: 'uploading' | 'error' | 'done';
  error?: string;
};

const ACCEPT_MIME = 'image/png,image/jpeg,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX = 8;

export function ProductImageUpload({
  value,
  onChange,
  productSlug,
  disabled = false,
  maxImages = DEFAULT_MAX,
}: Props) {
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragSourceIndex = useRef<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const remainingSlots = maxImages - value.length - pending.length;

  const validate = (file: File): string | null => {
    if (file.size === 0) return 'File is empty';
    if (file.size > MAX_BYTES) return 'File too large (max 5MB)';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return 'Unsupported type (PNG, JPEG, or WebP only)';
    }
    return null;
  };

  const upload = useCallback(
    (file: File) => {
      const validation = validate(file);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const previewUrl = URL.createObjectURL(file);

      if (validation) {
        setPending((p) => [...p, { id, previewUrl, name: file.name, status: 'error', error: validation }]);
        return;
      }

      setPending((p) => [...p, { id, previewUrl, name: file.name, status: 'uploading' }]);
      setError(null);

      startTransition(async () => {
        const res = await uploadProductImageAction(file, productSlug);
        if (res.error || !res.url) {
          setPending((p) =>
            p.map((item) => (item.id === id ? { ...item, status: 'error', error: res.error || 'Upload failed' } : item))
          );
        } else {
          URL.revokeObjectURL(previewUrl);
          setPending((p) => p.filter((item) => item.id !== id));
          onChange([...valueRef.current, res.url]);
        }
      });
    },
    [onChange, productSlug]
  );

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files);
    const slots = maxImages - value.length - pending.length;
    if (list.length > slots) {
      setError(`Only ${slots} more image${slots === 1 ? '' : 's'} can be added (max ${maxImages} total).`);
      return;
    }
    setError(null);
    for (const f of list) upload(f);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const onDropZone = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const onDropZoneOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const onDropZoneLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeAt = (idx: number) => {
    const url = value[idx];
    if (!url) return;
    onChange(value.filter((_, i) => i !== idx));
    startTransition(async () => {
      const res = await deleteProductImageAction(url);
      if (res.error) setError(`Removed from list, but storage cleanup failed: ${res.error}`);
    });
  };

  const retryPending = (id: string) => {
    const item = pending.find((p) => p.id === id);
    if (!item) return;
    URL.revokeObjectURL(item.previewUrl);
    setPending((p) => p.filter((x) => x.id !== id));
  };

  const setPrimary = (idx: number) => {
    if (idx === 0 || idx >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(idx, 1);
    next.unshift(moved);
    onChange(next);
  };

  const onThumbDragStart = (idx: number) => (e: DragEvent<HTMLLIElement>) => {
    if (disabled) return;
    dragSourceIndex.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const onThumbDragOver = (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onThumbDrop = (idx: number) => (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    const from = dragSourceIndex.current;
    dragSourceIndex.current = null;
    if (from === null || from === idx || from >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-ink-700">Images</label>
        <span className="text-xs text-ink-500">
          {value.length + pending.filter((p) => p.status === 'uploading').length}/{maxImages} · first image is the
          cover
        </span>
      </div>

      {(value.length > 0 || pending.length > 0) && (
        <ul
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
          aria-label="Uploaded product images"
        >
          {value.map((url, idx) => (
            <li
              key={url}
              draggable={!disabled}
              onDragStart={onThumbDragStart(idx)}
              onDragOver={onThumbDragOver}
              onDrop={onThumbDrop(idx)}
              className="group relative aspect-square overflow-hidden rounded-md border border-cream-300 bg-cream-100 motion-base cursor-move"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Product image ${idx + 1}`}
                className="h-full w-full object-cover motion-base group-hover:scale-[1.03]"
              />
              {idx === 0 && (
                <span className="absolute left-1.5 top-1.5 badge-mint text-[9px] py-0.5 px-1.5">Primary</span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/55 to-transparent px-1.5 py-1.5 opacity-0 group-hover:opacity-100 motion-base">
                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={() => setPrimary(idx)}
                    className="rounded-pill bg-cream-50/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-plum-800 hover:bg-cream-50"
                    aria-label={`Set image ${idx + 1} as primary`}
                  >
                    Set primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="ml-auto rounded-pill bg-red-600/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cream-50 hover:bg-red-700"
                  aria-label={`Remove image ${idx + 1}`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}

          {pending.map((p) => (
            <li
              key={p.id}
              className="relative aspect-square overflow-hidden rounded-md border border-dashed border-cream-300 bg-cream-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.previewUrl} alt="" className="h-full w-full object-cover opacity-60" />
              {p.status === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-cream-50/70 text-xs font-medium text-plum-800">
                  Uploading…
                </div>
              )}
              {p.status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-50/85 p-2 text-center text-[10px] text-red-700">
                  <span className="font-semibold">Failed</span>
                  <span className="line-clamp-2">{p.error}</span>
                  <button
                    type="button"
                    onClick={() => retryPending(p.id)}
                    className="mt-1 rounded-pill bg-red-700 px-2 py-0.5 text-cream-50 hover:bg-red-800"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {remainingSlots > 0 && (
        <label
          onDrop={onDropZone}
          onDragOver={onDropZoneOver}
          onDragLeave={onDropZoneLeave}
          className={[
            'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-8 text-center motion-base',
            disabled
              ? 'border-cream-200 bg-cream-50 text-ink-400 cursor-not-allowed'
              : isDragOver
                ? 'border-plum-500 bg-plum-50 text-plum-800'
                : 'border-cream-300 bg-cream-50 text-ink-600 hover:border-plum-300 hover:bg-cream-100',
          ].join(' ')}
        >
          <span className="text-sm font-medium">Drop images here, or click to choose</span>
          <span className="text-xs text-ink-500">PNG, JPEG, or WebP · up to 5MB each · {remainingSlots} more allowed</span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_MIME}
            multiple
            disabled={disabled}
            onChange={onInputChange}
            className="sr-only"
            data-testid="product-image-input"
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
