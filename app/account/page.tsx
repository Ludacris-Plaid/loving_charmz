import { Card } from '@/components/ui/Card';

export default function AccountPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-brand-800">Welcome back</h2>
        <p className="mt-1 text-sm text-brand-600">Manage your profile, wishlist, orders, and custom keepsakes.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card padding="md" className="flex flex-col gap-2">
          <h3 className="font-medium text-brand-800">Profile</h3>
          <p className="text-sm text-brand-600">Update your display name, avatar, bio, and pet story.</p>
        </Card>
        <Card padding="md" className="flex flex-col gap-2">
          <h3 className="font-medium text-brand-800">Wishlist</h3>
          <p className="text-sm text-brand-600">Keep track of pieces you love.</p>
        </Card>
        <Card padding="md" className="flex flex-col gap-2">
          <h3 className="font-medium text-brand-800">Orders</h3>
          <p className="text-sm text-brand-600">View your order history and track shipments.</p>
        </Card>
        <Card padding="md" className="flex flex-col gap-2">
          <h3 className="font-medium text-brand-800">Custom Orders</h3>
          <p className="text-sm text-brand-600">View your personalized keepsake requests.</p>
        </Card>
      </div>
    </div>
  );
}