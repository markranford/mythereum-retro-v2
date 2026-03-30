import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent } from '../components/ui/card';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  const { identity } = useInternetIdentity();

  if (!identity) {
    return (
      <div className="text-center py-12">
        <Bell className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-amber-400 mb-2">Login Required</h2>
        <p className="text-amber-200/70">Please login to view your notifications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-amber-400">Notifications</h1>
        <p className="text-xl text-amber-200/80">
          Stay updated with game events, tournament invitations, battle results, and important announcements.
        </p>
      </div>

      <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          <Bell className="w-16 h-16 text-amber-400 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-amber-400 mb-2">No Notifications</h2>
          <p className="text-amber-200/70">You're all caught up! Check back later for updates.</p>
        </CardContent>
      </Card>
    </div>
  );
}
