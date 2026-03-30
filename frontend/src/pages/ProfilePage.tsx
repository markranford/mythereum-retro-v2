import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile, useGetMyPlayerAccount } from '../hooks/useQueries';
import { useAccount } from '../context/AccountContext';
import { useTelemetry } from '../context/TelemetryContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { User, Trophy, Sword, Shield, Settings } from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: playerAccount } = useGetMyPlayerAccount();
  const { account } = useAccount();
  const { summary } = useTelemetry();

  if (!account) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-amber-400 mb-2">No Account Found</h2>
        <p className="text-amber-200/70">Please create an account to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-amber-400">Player Profile</h1>
        <p className="text-xl text-amber-200/80">
          View your stats, achievements, and progression through the world of Mythereum.
        </p>
      </div>

      <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-amber-400 text-2xl flex items-center gap-2">
              <User className="w-6 h-6" />
              {account.displayName}
            </CardTitle>
            <Button
              onClick={() => navigate({ to: '/profile/settings' })}
              className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-amber-300 font-semibold">Account ID</div>
              <div className="text-amber-200/70 text-sm font-mono break-all">
                {account.accountId}
              </div>
            </div>
            {account.email && (
              <div className="space-y-2">
                <div className="text-amber-300 font-semibold">Email</div>
                <div className="text-amber-200/70">{account.email}</div>
              </div>
            )}
            {identity && (
              <div className="space-y-2">
                <div className="text-amber-300 font-semibold">Internet Identity</div>
                <div className="text-amber-200/70 text-sm font-mono break-all">
                  {identity.getPrincipal().toString()}
                </div>
              </div>
            )}
            {userProfile && (
              <div className="space-y-2">
                <div className="text-amber-300 font-semibold">Profile Name</div>
                <div className="text-amber-200/70">{userProfile.name}</div>
              </div>
            )}
            {playerAccount && (
              <>
                <div className="space-y-2">
                  <div className="text-amber-300 font-semibold flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Level
                  </div>
                  <div className="text-amber-400 text-2xl font-bold">{playerAccount.level.toString()}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-amber-300 font-semibold flex items-center gap-2">
                    <Sword className="w-4 h-4" />
                    Experience
                  </div>
                  <div className="text-amber-400 text-2xl font-bold">{playerAccount.experience.toString()}</div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-amber-400 flex items-center gap-2">
              <Sword className="w-5 h-5" />
              Battles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">{summary.totalBattles}</div>
            <div className="text-sm text-amber-200/70">Total battles fought</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-amber-400 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Victories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">
              {Object.values(summary.cardStats).reduce((sum, card) => sum + card.gamesWon, 0)}
            </div>
            <div className="text-sm text-amber-200/70">Battles won</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-amber-400 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">
              {summary.totalBattles > 0
                ? `${((Object.values(summary.cardStats).reduce((sum, card) => sum + card.gamesWon, 0) / summary.totalBattles) * 100).toFixed(1)}%`
                : '0%'}
            </div>
            <div className="text-sm text-amber-200/70">Overall performance</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
