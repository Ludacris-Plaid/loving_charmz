'use client';

import { useRef, useState, useTransition } from 'react';
import { Input } from '@/components/ui/Input';
import { createPersonalizationRequestAction } from '@/lib/personalization/actions';

type Props = {
  products: Array<{ id: string; name: string }>;
};

export function CustomOrderForm({ products }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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

      <Input
        label="Reference image URL (optional)"
        name="reference_image_url"
        placeholder="https://"
        type="url"
        autoComplete="off"
      />

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
