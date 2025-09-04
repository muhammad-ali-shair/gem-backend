import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as LucideIcons from "lucide-react";

export default function ReferralLeaderboard() {
  const { data: referralLeaderboard, isLoading } = useQuery({
    queryKey: ["/api/referrals/leaderboard"],
    refetchInterval: 30000,
  });

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className={className || "w-4 h-4"} />;
    }
    return <LucideIcons.Award className={className || "w-4 h-4"} />;
  };

  if (isLoading) {
    return (
      <Card className="bg-[#253935] border-[#22cda6]/20">
        <CardContent className="p-6">
          <div className="text-center py-8 text-white">Loading referral leaderboard...</div>
        </CardContent>
      </Card>
    );
  }

  const leaders = Array.isArray(referralLeaderboard) ? referralLeaderboard : [];

  if (leaders.length === 0) {
    return (
      <Card className="bg-[#253935] border-[#22cda6]/20">
        <CardHeader className="border-b border-[#22cda6]/20">
          <CardTitle className="text-xl font-bold text-white flex items-center">
            {renderIcon('Users', 'h-6 w-6 text-[#22cda6] mr-3')}
            Referral Champions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">{renderIcon('Users', 'h-16 w-16 text-gray-600 mx-auto')}</div>
            <div className="text-white mb-2">No qualified referrals yet</div>
            <div className="text-gray-400 text-sm">
              Referrals must invest $20+ or create tokens/presales to qualify
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatPoints = (points: number) => {
    return points.toLocaleString();
  };

  return (
    <Card className="bg-[#253935] border-[#22cda6]/20">
      <CardHeader className="border-b border-[#22cda6]/20">
        <CardTitle className="text-xl font-bold text-white flex items-center justify-between">
          <div className="flex items-center">
            {renderIcon('Users', 'h-6 w-6 text-[#22cda6] mr-3')}
            Referral Champions
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  {renderIcon('Shield', 'h-4 w-4 text-orange-400')}
                </TooltipTrigger>
                <TooltipContent className="max-w-sm bg-[#253935] border-[#22cda6]">
                  <div className="text-sm text-white">
                    <div className="font-medium mb-2">Anti-Sybil Protection Active</div>
                    <div className="text-xs text-gray-400 leading-relaxed">
                      Only qualified referrals count toward rankings. Referees must invest $20+ or create tokens/presales. 
                      This prevents self-referral farming and ensures genuine community growth.
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span>Quality Verified</span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-[#22cda6]/10">
          {leaders.map((leader: any, index: number) => (
            <div key={leader.user.id} className="p-4 hover:bg-[#22cda6]/5 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Rank Badge */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900' :
                    'bg-[#22cda6]/20 text-[#22cda6]'
                  }`}>
                    {leader.rank}
                  </div>

                  {/* User Info */}
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 border-2 border-[#22cda6]/30">
                      {leader.user.avatar && <AvatarImage src={leader.user.avatar} alt={leader.user.username || 'User avatar'} />}
                      <AvatarFallback className="bg-[#22cda6]/20 text-[#22cda6] font-medium">
                        {leader.user.username?.slice(0, 2).toUpperCase() || 
                         formatWalletAddress(leader.user.walletAddress).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="text-white font-medium">
                        {leader.user.username || formatWalletAddress(leader.user.walletAddress)}
                      </div>
                      {leader.user.username && (
                        <div className="text-xs text-gray-400">
                          {formatWalletAddress(leader.user.walletAddress)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <div className="flex items-center space-x-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="text-center">
                            <div className="text-[#22cda6] font-bold text-lg">
                              {leader.qualifiedReferrals}
                            </div>
                            <div className="text-xs text-gray-400">Qualified</div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#253935] border-[#22cda6]">
                          <div className="text-sm text-white">
                            <div className="font-medium">Anti-Sybil Protection:</div>
                            <div className="text-xs text-gray-400 mt-1">
                              • Referees must invest $20+ in launches<br/>
                              • OR create their own token/presale<br/>  
                              • Prevents self-referral farming
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="text-center">
                      <div className="text-white font-bold text-lg">
                        {formatPoints(leader.totalReferralPoints)}
                      </div>
                      <div className="text-xs text-gray-400">Points</div>
                    </div>

                    {/* Milestone Badges */}
                    <div className="flex flex-col space-y-1">
                      {leader.qualifiedReferrals >= 50 && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs px-2 py-0 h-5">
                          Legend
                        </Badge>
                      )}
                      {leader.qualifiedReferrals >= 25 && leader.qualifiedReferrals < 50 && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs px-2 py-0 h-5">
                          Master
                        </Badge>
                      )}
                      {leader.qualifiedReferrals >= 10 && leader.qualifiedReferrals < 25 && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-2 py-0 h-5">
                          Expert
                        </Badge>
                      )}
                      {leader.qualifiedReferrals >= 5 && leader.qualifiedReferrals < 10 && (
                        <Badge className="bg-[#22cda6]/20 text-[#22cda6] border-[#22cda6]/30 text-xs px-2 py-0 h-5">
                          Pro
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>


      </CardContent>
    </Card>
  );
}