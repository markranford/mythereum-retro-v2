import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetMyPlayerAccount } from '../hooks/useQueries';
import { useStronghold } from '../context/StrongholdContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Sword, Shield, Trophy, Coins, Castle } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { data: playerAccount } = useGetMyPlayerAccount();
  const { stronghold } = useStronghold();

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-amber-400 drop-shadow-lg">
          Welcome to Mythereum Retro V2
        </h1>
        <p className="text-xl text-amber-200/80 max-w-3xl mx-auto">
          Enter a world of strategic card battles, build your stronghold, collect legendary heroes, and compete in epic tournaments. Your journey to glory begins here.
        </p>
        
        {identity && (
          <Button
            onClick={() => navigate({ to: '/strongholds' })}
            className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold px-8 py-3 text-lg"
          >
            <Castle className="w-5 h-5 mr-2" />
            {stronghold ? 'Enter Stronghold' : 'Start as Warlord'}
          </Button>
        )}
      </div>

      {identity && playerAccount && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-300">Player Level</CardTitle>
              <Trophy className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{playerAccount.level.toString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-300">Experience</CardTitle>
              <Sword className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{playerAccount.experience.toString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-300">Battles Won</CardTitle>
              <Shield className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">0</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-300">Gold</CardTitle>
              <Coins className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">
                {stronghold ? Math.floor(stronghold.resources.gold) : 1000}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm hover:border-amber-400/50 transition-all">
          <CardHeader>
            <CardTitle className="text-amber-400">Quick Battle</CardTitle>
          </CardHeader>
          <CardContent className="text-amber-200/70">
            Jump into a quick match against another player and test your deck's strength in fast-paced combat.
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm hover:border-amber-400/50 transition-all">
          <CardHeader>
            <CardTitle className="text-amber-400">Daily Quests</CardTitle>
          </CardHeader>
          <CardContent className="text-amber-200/70">
            Complete daily challenges to earn rewards, experience points, and unlock special items for your collection.
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm hover:border-amber-400/50 transition-all">
          <CardHeader>
            <CardTitle className="text-amber-400">Leaderboards</CardTitle>
          </CardHeader>
          <CardContent className="text-amber-200/70">
            Climb the ranks and compete with players worldwide. Prove your strategic mastery and claim your place among legends.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
