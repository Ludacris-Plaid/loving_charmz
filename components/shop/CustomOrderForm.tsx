'use client';

import { useRef, useState, useTransition, type ChangeEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { createPersonalizationRequestAction } from '@/lib/personalization/actions';
import { uploadReferenceImageAction } from '@/lib/personalization/upload';

type Props = {
  products: Array<{ id: string; name: string }>;
};

export function CustomOrderForm({ products }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setFileName(file.name);
    setUploading(true);
    startTransition(async () => {
      const res = await uploadReferenceImageAction(file);
      setUploading(false);
      if (res.error || !res.url) {
        setUploadError(res.error || 'Upload failed');
        setFileName(null);
        return;
      }
      setReferenceUrl(res.url);
    });
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await createPersonalizationRequestAction(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        formRef.current?.reset();
      }
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4 text-left">
      <div>
        <label htmlFor="product_id" className="block text-sm font-medium text-ink-700 mb-1.5">
          Base piece (optional)
        </label>
        <select
          id="product_id"
          name="product_id"
          className="input-base"
          defaultValue=""
        >
          <option value="">Not sure yet — surprise me</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <Input label="Pet’s name" name="pet_name" placeholder="e.g. Luna" autoComplete="off" />

      <Input
        label="Charm selections (comma-separated)"
        name="charm_selections"
        placeholder="paw, heart, moon"
        autoComplete="off"
        hint="Optional — list the symbols you would like included."
      />

      <div>
        <label htmlFor="freeform_text" className="block text-sm font-medium text-ink-700 mb-1.5">
          Tell us your story
        </label>
        <textarea
          id="freeform_text"
          name="freeform_text"
          rows={5}
          required
          placeholder="What would you like this keepsake to carry? Any dates, materials, or feelings to honor?"
          className="input-base resize-none"
        />
      </div>

      <input type="hidden" name="reference_image_url" value={referenceUrl || ''} />
      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-ink-700">Reference photo (optional)</span>
        <label
          className={[
            'flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-6 text-center motion-base',
            uploading
              ? 'cursor-wait border-cream-200 bg-cream-50 text-ink-400'
              : 'border-cream-300 bg-cream-50 text-ink-600 hover:border-plum-300 hover:bg-cream-100',
          ].join(' ')}
        >
          <span className="text-sm font-medium">
            {uploading
              ? 'Uploading…'
              : fileName
                ? fileName
                : 'Drop a photo here, or click to choose from your device'}
          </span>
          <span className="text-xs text-ink-500">PNG, JPEG, or WebP · up to 5MB</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} className="sr-only" />
        </label>
        {uploadError && (
          <p className="text-xs text-red-600" role="alert">{uploadError}</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}
      {success && (
        <p className="text-sm text-plum-700" role="status">
          Thank you — your request is in. We will follow up by email within two business days.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-plum w-full py-3 text-sm">
        {pending ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  );
}
