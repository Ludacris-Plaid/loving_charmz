'use client';

import { useState, useEffect } from 'react';
import { AvatarUpload } from '@/components/account/AvatarUpload';

export default function ProfilePage() {
  const [profile, setProfile] = useState({ 
    id: '', username: '', display_name: '', bio: '', pet_story: '', is_public: true, avatar_url: '' 
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Mock user - in real app would fetch from Supabase
    setTimeout(() => {
      setProfile({ 
        id: '26a04217-67c9-4c5d-b33f-6e41f593a060',
        username: 'admin', 
        display_name: 'Admin User', 
        bio: '', 
        pet_story: '', 
        is_public: true, 
        avatar_url: '' 
      });
      setLoading(false);
    }, 500);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner-dots"><span></span><span></span><span></span></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-obsidian-50">My Profile</h1>

      <div className="surface-premium rounded-card p-6 border border-obsidian-700/50">
        <h2 className="font-display text-lg font-semibold text-obsidian-50 mb-4">Profile Photo</h2>
        <AvatarUpload currentAvatar={profile.avatar_url} userId={profile.id} />
      </div>

      <div className="surface-premium rounded-card p-6 border border-obsidian-700/50 space-y-4">
        <div>
          <label className="block text-sm font-medium text-obsidian-300 mb-2">Username</label>
          <input
            type="text"
            value={profile.username}
            onChange={e => setProfile({ ...profile, username: e.target.value })}
            className="input-gold w-full px-4 py-3 rounded-card"
            disabled
          />
          <p className="text-xs text-obsidian-500 mt-1">Username cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-obsidian-300 mb-2">Display Name</label>
          <input
            type="text"
            value={profile.display_name}
            onChange={e => setProfile({ ...profile, display_name: e.target.value })}
            placeholder="How you'd like to be called"
            className="input-gold w-full px-4 py-3 rounded-card"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-obsidian-300 mb-2">Bio</label>
          <textarea
            value={profile.bio}
            onChange={e => setProfile({ ...profile, bio: e.target.value })}
            placeholder="A short bio about yourself"
            rows={3}
            className="input-gold w-full px-4 py-3 rounded-card resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-obsidian-300 mb-2">Pet Story</label>
          <textarea
            value={profile.pet_story}
            onChange={e => setProfile({ ...profile, pet_story: e.target.value })}
            placeholder="Share your story with your pet..."
            rows={4}
            className="input-gold w-full px-4 py-3 rounded-card resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_public"
            checked={profile.is_public}
            onChange={e => setProfile({ ...profile, is_public: e.target.checked })}
            className="w-5 h-5 accent-gold-500"
          />
          <label htmlFor="is_public" className="text-obsidian-300">Make my profile public</label>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button onClick={handleSave} disabled={saving} className="btn-gold px-8 py-3 rounded-pill text-sm font-semibold uppercase">
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}