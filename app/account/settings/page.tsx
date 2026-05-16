'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-obsidian-50">Settings</h1>

      <section className="surface-premium rounded-card p-6 border border-obsidian-700/50">
        <h2 className="font-display text-lg font-semibold text-obsidian-50 mb-4">Email Preferences</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-obsidian-300">Order updates</span>
            <input
              type="checkbox"
              checked={orderUpdates}
              onChange={e => setOrderUpdates(e.target.checked)}
              className="w-5 h-5 accent-gold-500"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-obsidian-300">Marketing emails</span>
            <input
              type="checkbox"
              checked={marketingEmails}
              onChange={e => setMarketingEmails(e.target.checked)}
              className="w-5 h-5 accent-gold-500"
            />
          </label>
        </div>
      </section>

      <section className="surface-premium rounded-card p-6 border border-obsidian-700/50">
        <h2 className="font-display text-lg font-semibold text-obsidian-50 mb-4">Security</h2>
        <div className="space-y-4">
          <button className="btn-outline-gold w-full py-3 rounded-pill text-sm font-semibold uppercase">
            Change Password
          </button>
          <button className="w-full py-3 text-sm text-rose-400 hover:text-rose-300">
            Delete Account
          </button>
        </div>
      </section>

      <section className="surface-premium rounded-card p-6 border border-obsidian-700/50">
        <h2 className="font-display text-lg font-semibold text-obsidian-50 mb-4">Sign Out</h2>
        <form action="/logout" method="POST">
          <button type="submit" className="text-obsidian-400 hover:text-rose-400 text-sm">
            Sign out of your account →
          </button>
        </form>
      </section>
    </div>
  );
}