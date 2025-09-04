import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Users, Rocket, TrendingUp } from "lucide-react";

export default function StatsOverview() {
  // These would normally come from API calls based on connected wallet
  const userStats = {
    totalPoints: 0,
    rank: 0,
    referralCount: 0,
    launchCount: 0,
    volumeContributed: 0
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Welcome section with Gemmy */}
      <Card className="bg-gradient-to-r from-gem-slate to-gem-dark border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 64 64" className="w-12 h-12">
                  {/* Robot head */}
                  <circle cx="32" cy="28" r="14" fill="#4a90e2" stroke="#2563eb" strokeWidth="2"/>
                  {/* Eyes */}
                  <circle cx="27" cy="25" r="3" fill="#22cda6"/>
                  <circle cx="37" cy="25" r="3" fill="#22cda6"/>
                  {/* Smile */}
                  <path d="M 26 32 Q 32 36 38 32" stroke="#22cda6" strokeWidth="2" fill="none"/>
                  {/* Antenna */}
                  <line x1="32" y1="14" x2="32" y2="8" stroke="#2563eb" strokeWidth="2"/>
                  <circle cx="32" cy="8" r="2" fill="#22cda6"/>
                  {/* Body */}
                  <rect x="24" y="40" width="16" height="20" rx="4" fill="#4a90e2" stroke="#2563eb" strokeWidth="2"/>
                  {/* Gem on chest */}
                  <polygon points="32,46 35,49 32,52 29,49" fill="#22cda6"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary mb-1">
                  Welcome to Gemlaunch Leaderboard!
                </h2>
                <p className="text-sm text-gray-300">
                  Track your on-chain activities and climb the ranks for upcoming airdrops
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">🚀</div>
              <div className="text-xs text-gray-400">Earn Points</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">5</div>
              <div className="text-sm text-muted-foreground">Funded Projects</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">$39.76</div>
              <div className="text-sm text-muted-foreground">Raised Contribution</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">2</div>
              <div className="text-sm text-muted-foreground">Unique Participants</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
