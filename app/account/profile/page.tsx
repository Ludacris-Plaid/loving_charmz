import { redirect } from 'next/navigation';
import { getSession } from '@/components/admin/AdminGuard';
import { createClient } from '@/lib/supabase/server';
import { AvatarUpload } from '@/components/account/AvatarUpload';
import { ProfileForm } from '@/components/account/ProfileForm';

export const metadata = {
  title: 'Profile — Loving Charmz',
};

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/account/profile');

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, pet_story, avatar_url, is_public')
    .eq('id', session.userId)
    .maybeSingle();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-plum-900">My profile</h1>
        <p className="text-sm text-ink-600 mt-1">How you appear across Loving Charmz.</p>
      </div>

      <section className="surface-card p-6">
        <h2 className="font-display text-lg font-semibold text-plum-900 mb-4">Profile photo</h2>
        <AvatarUpload
          currentAvatar={profile?.avatar_url || null}
          userId={session.userId}
        />
      </section>

      <section className="surface-card p-6">
        <h2 className="font-display text-lg font-semibold text-plum-900 mb-4">Account</h2>
        <ProfileForm
          username={profile?.username || ''}
          defaultDisplayName={profile?.display_name || ''}
          defaultBio={profile?.bio || ''}
          defaultPetStory={profile?.pet_story || ''}
          defaultIsPublic={Boolean(profile?.is_public)}
        />
      </section>
    </div>
  );
}
