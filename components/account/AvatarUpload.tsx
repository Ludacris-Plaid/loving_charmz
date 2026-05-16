'use client';

import { useState, useRef } from 'react';

interface Props {
  currentAvatar?: string;
  userId: string;
}

export function AvatarUpload({ currentAvatar, userId }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Max 5MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    setError(null);
    setUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      // Upload to Supabase Storage
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${supabaseUrl}/storage/v1/object/avatars/${userId}`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: file,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      // Get public URL
      const avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${userId}`;
      
      // TODO: Save to profile in database
      console.log('Avatar uploaded:', avatarUrl);
      
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = preview || currentAvatar;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-obsidian-800 flex items-center justify-center border-2 border-obsidian-700">
            {displayUrl ? (
              <img 
                src={displayUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl text-obsidian-500">👤</span>
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-obsidian-900/80 flex items-center justify-center rounded-full">
              <div className="spinner-gold w-6 h-6" />
            </div>
          )}
        </div>
        
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-outline-gold px-4 py-2 rounded-pill text-sm font-medium"
          >
            {uploading ? 'Uploading...' : 'Change Photo'}
          </button>
          <p className="text-xs text-obsidian-500 mt-2">JPG, PNG. Max 5MB.</p>
        </div>
      </div>
      
      {error && (
        <p className="text-rose-400 text-sm">{error}</p>
      )}
    </div>
  );
}