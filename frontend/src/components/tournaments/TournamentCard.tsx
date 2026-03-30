import { Tournament } from '../../types/tournaments';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Trophy, Users, Coins, Calendar } from 'lucide-react';

interface TournamentCardProps {
  tournament: Tournament;
  onSelect: () => void;
}

export default function TournamentCard({ tournament, onSelect }: TournamentCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'text-blue-400';
      case 'registration':
        return 'text-green-400';
      case 'active':
        return 'text-amber-400';
      case 'completed':
        return 'text-gray-400';
      default:
        return 'text-amber-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'Upcoming';
      case 'registration':
        return 'Open for Registration';
      case 'active':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  return (
    <Card
      onClick={onSelect}
      className="bg-gradient-to-br from-amber-950/40 to-slate-900/60 border-2 border-amber-600/30 backdrop-blur-sm hover:border-amber-500/60 transition-all cursor-pointer hover:shadow-lg hover:shadow-amber-500/20"
    >
      <CardHeader>
        <CardTitle className="text-amber-300 flex items-center gap-2 text-xl">
          <Trophy className="w-6 h-6 text-amber-400" />
          {tournament.config.name}
        </CardTitle>
        <CardDescription className="text-amber-200/70">
          <span className={getStatusColor(tournament.status)}>● {getStatusText(tournament.status)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tournament.config.description && (
          <p className="text-amber-200/80 text-sm">{tournament.config.description}</p>
        )}
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-amber-300">
            <Users className="w-4 h-4" />
            <span>{tournament.participants.length}/{tournament.config.maxParticipants}</span>
          </div>
          
          <div className="flex items-center gap-2 text-amber-300">
            <Coins className="w-4 h-4" />
            <span>{tournament.config.entryFee} Mythex</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-amber-300/70 text-xs">
          <Calendar className="w-3 h-3" />
          <span>{tournament.config.format}</span>
        </div>

        {tournament.rewards && (
          <div className="pt-2 border-t border-amber-600/20">
            <div className="text-xs text-amber-300/70 mb-1">Rewards</div>
            <div className="text-sm text-amber-400 font-semibold">
              1st: {tournament.rewards.first.mythex} Mythex
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
