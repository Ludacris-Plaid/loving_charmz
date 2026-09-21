import { createAdminClient } from '@/lib/supabase/admin';
import { RecentErrors } from '@/components/admin/RecentErrors';

export const metadata = {
  title: 'Monitoring — Loving Charmz Admin',
};

export default async function MonitoringPage() {
  const admin = createAdminClient();

  const [{ data: errors }, { data: viewStats }] = await Promise.all([
    admin
      .from('error_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('page_views')
      .select('path, device, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);

  // Aggregate page views by path
  const viewsByPath: Record<string, number> = {};
  const viewsByDevice: Record<string, number> = {};
  (viewStats || []).forEach((v: any) => {
    viewsByPath[v.path] = (viewsByPath[v.path] || 0) + 1;
    viewsByDevice[v.device || 'other'] = (viewsByDevice[v.device || 'other'] || 0) + 1;
  });

  const topPaths = Object.entries(viewsByPath)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-plum-900">Monitoring</h1>
        <p className="text-sm text-ink-600 mt-1">Recent errors and visitor traffic.</p>
      </div>

      {/* Traffic summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="surface-card p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-1">Total views</p>
          <p className="text-2xl font-bold text-plum-900">{(viewStats || []).length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-1">Unique pages</p>
          <p className="text-2xl font-bold text-plum-900">{Object.keys(viewsByPath).length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-1">Errors</p>
          <p className="text-2xl font-bold text-red-700">{(errors || []).length}</p>
        </div>
      </div>

      {/* Device breakdown */}
      {Object.keys(viewsByDevice).length > 0 && (
        <div className="surface-card p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-3">Devices</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(viewsByDevice).map(([device, count]) => (
              <span key={device} className="badge-mint">
                {device}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top pages */}
      {topPaths.length > 0 && (
        <div className="surface-card p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-3">Top pages</p>
          <div className="space-y-2">
            {topPaths.map(([path, count]) => (
              <div key={path} className="flex justify-between text-sm">
                <span className="text-ink-700 font-mono">{path}</span>
                <span className="text-ink-500">{count} views</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent errors */}
      <div className="surface-card p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-3">Recent errors</p>
        <RecentErrors errors={(errors || []) as any} />
      </div>
    </div>
  );
}
