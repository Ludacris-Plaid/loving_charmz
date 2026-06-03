'use client';

import { useRef, useState, useTransition } from 'react';
import { uploadAvatarAction } from '@/lib/account/actions';

type Props = {
  currentAvatar?: string | null;
  userId: string;
};

export function AvatarUpload({ currentAvatar, userId }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Max 5MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    setError(null);
    setSuccess(false);

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('file', file);

    startTransition(async () => {
      const res = await uploadAvatarAction(userId, formData);
      if (res.error) {
        setError(res.error);
        setPreview(null);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      }
    });
  };

  const displayUrl = preview || currentAvatar;

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-cream-300 bg-cream-100 flex items-center justify-center">
          {displayUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={displayUrl} alt="Avatar preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl text-ink-400">U</span>
          )}
        </div>
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-cream-50/80">
            <div className="spinner-plum" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={pending}
          className="btn-outline px-4 py-1.5 text-xs"
        >
          {pending ? 'Uploading…' : 'Change photo'}
        </button>
        <p className="text-xs text-ink-500">JPG, PNG, or WEBP. Max 5MB.</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-plum-700">Photo updated.</p>}
      </div>
    </div>
  );
}
