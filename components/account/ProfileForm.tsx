'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/Input';
import { updateProfileAction } from '@/lib/account/actions';

type Props = {
  username: string;
  defaultDisplayName: string;
  defaultBio: string;
  defaultPetStory: string;
  defaultIsPublic: boolean;
};

export function ProfileForm({
  username,
  defaultDisplayName,
  defaultBio,
  defaultPetStory,
  defaultIsPublic,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await updateProfileAction(formData);
      if (res.error) setError(res.error);
      else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1.5">Username</label>
        <input
          value={username}
          disabled
          className="input-base opacity-60"
        />
        <p className="text-xs text-ink-500 mt-1">Username cannot be changed.</p>
      </div>

      <Input
        label="Display name"
        name="display_name"
        defaultValue={defaultDisplayName}
        placeholder="How you’d like to be called"
        autoComplete="name"
      />

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-ink-700 mb-1.5">Bio</label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={defaultBio}
          placeholder="A short bio about yourself"
          className="input-base resize-none"
        />
      </div>

      <div>
        <label htmlFor="pet_story" className="block text-sm font-medium text-ink-700 mb-1.5">Pet story</label>
        <textarea
          id="pet_story"
          name="pet_story"
          rows={4}
          defaultValue={defaultPetStory}
          placeholder="Share your story with your pet…"
          className="input-base resize-none"
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="is_public"
          defaultChecked={defaultIsPublic}
          className="h-5 w-5 accent-plum-700"
        />
        <span className="text-sm text-ink-700">Make my profile public</span>
      </label>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {success && <p className="text-sm text-plum-700" role="status">Profile updated.</p>}

      <button type="submit" disabled={pending} className="btn-plum px-6 py-2.5 text-sm">
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
