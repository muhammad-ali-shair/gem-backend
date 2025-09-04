import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as LucideIcons from "lucide-react";
import { web3Service } from "@/lib/web3";
import { ACCOLADES } from "@shared/accolades";
import { useState, useEffect } from "react";

export default function LeaderboardTable() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate pagination
  const totalPages = Math.ceil(users.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const paginatedUsers = users.slice(startIndex, endIndex);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get top 3 for podium
  const topThree = users.slice(0, 3);

  // Find current user from connected wallet
  useEffect(() => {
    const connectedWallet = web3Service.getAccount();
    if (connectedWallet && users.length > 0) {
      const user = users.find((u: any) => u.walletAddress.toLowerCase() === connectedWallet.toLowerCase());
      if (user) {
        // Add rank to current user
        const userWithRank = { ...user, rank: users.findIndex((u: any) => u.id === user.id) + 1 };
        setCurrentUser(userWithRank);
      }
    }
  }, [users]);

  if (isLoading) {
    return (
      <Card className="bg-[#253935] border-[#22cda6]/20">
        <CardContent className="p-6">
          <div className="text-center py-8 text-white">Loading leaderboard...</div>
        </CardContent>
      </Card>
    );
  }

  const remaining = users.slice(3);

  const getAccoladeData = (type: string) => {
    const accolade = ACCOLADES.find(a => a.id === type);
    return accolade ? {
      icon: accolade.icon,
      name: accolade.name,
      description: accolade.description,
      rarity: accolade.rarity,
      pointsBonus: accolade.pointsBonus
    } : {
      icon: 'Award',
      name: 'Unknown Accolade',
      description: 'Achievement not found',
      rarity: 'common' as const,
      pointsBonus: 0
    };
  };

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className={className || "w-4 h-4"} />;
    }
    return <LucideIcons.Award className={className || "w-4 h-4"} />;
  };



  const renderAccolades = (accolades: any[]) => {
    if (!accolades || accolades.length === 0) {
      return null; // Don't show any text for users with no accolades
    }

    // Show first 2 accolades as icons inline, then a badge count for the rest
    const visibleAccolades = accolades.slice(0, 2);
    const hiddenCount = accolades.length - 2;

    return (
      <div className="flex items-center gap-1">
        {visibleAccolades.map((accolade: any, index: number) => {
          const accoladeData = getAccoladeData(accolade.accoladeType);
          return (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-[#22cda6] hover:scale-110 transition-transform cursor-help">
                    {renderIcon(accoladeData.icon, "w-4 h-4")}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-[#253935] border-[#22cda6]">
                  <div className="text-sm text-white">
                    <div className="font-medium">{accoladeData.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{accoladeData.description}</div>
                    <div className="text-xs text-[#22cda6] mt-1">+{accoladeData.pointsBonus} points</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
        {hiddenCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs px-1 py-0 h-5 border-[#22cda6]/50 text-[#22cda6] bg-[#22cda6]/5">
                  +{hiddenCount}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-[#253935] border-[#22cda6]">
                <div className="text-sm text-white">
                  <div className="font-medium">Additional Accolades:</div>
                  <div className="text-xs text-gray-400 mt-1 space-y-1">
                    {accolades.slice(2).map((accolade, idx) => {
                      const data = getAccoladeData(accolade.accoladeType);
                      return (
                        <div key={idx} className="flex items-center gap-1">
                          {renderIcon(data.icon, "w-4 h-4 text-[#22cda6]")}
                          <span>{data.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-[#253935] border-[#22cda6]/20 overflow-hidden">
      <CardHeader className="border-b border-[#22cda6]/20">
        <CardTitle className="text-xl font-bold text-white flex items-center justify-between">
          <div>
            <div className="flex items-center">
              {renderIcon('Crown', 'h-6 w-6 text-[#22cda6] mr-3')}
              Global Leaderboard
            </div>
            <div className="flex items-center space-x-2 mt-1 text-sm">
              <span className="text-orange-400 font-medium">Season 1</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-400">BNB Chain</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            {renderIcon('Clock', 'h-4 w-4')}
            <span>Live Updates</span>
            <div className="w-2 h-2 bg-[#22cda6] rounded-full animate-pulse" />
          </div>
        </CardTitle>
      </CardHeader>
      {/* Top 10 Podium */}
      <div className="p-6 bg-gradient-to-br from-[#253935] to-[#1a2b21]">
        {/* Top 3 Podium */}
        <div className="flex justify-center items-end space-x-4 mb-6">
          {/* 2nd Place */}
          {topThree[1] && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center mb-3 mx-auto">
                <span className="text-xl font-bold text-white">2</span>
              </div>
              <div className="bg-[#253935] rounded-lg p-3 min-h-[80px] flex flex-col justify-center">
                <div className="font-bold text-sm truncate text-white">
                  {topThree[1].username || `${topThree[1].walletAddress.slice(0, 6)}...${topThree[1].walletAddress.slice(-4)}`}
                </div>
                <div className="text-[#22cda6] text-xs font-medium">
                  {topThree[1].totalPoints.toLocaleString()} pts
                </div>
                <div className="text-xs text-gray-400 mt-1">Rank #{topThree[1].rank}</div>
              </div>
            </div>
          )}

          {/* 1st Place */}
          {topThree[0] && (
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-3 mx-auto">
                {renderIcon('Crown', 'h-6 w-6 text-yellow-800')}
              </div>
              <div className="bg-[#22cda6]/20 border border-[#22cda6] rounded-lg p-4 min-h-[100px] flex flex-col justify-center">
                <div className="font-bold text-white">
                  {topThree[0].username || `${topThree[0].walletAddress.slice(0, 6)}...${topThree[0].walletAddress.slice(-4)}`}
                </div>
                <div className="text-[#22cda6] font-bold">
                  {topThree[0].totalPoints.toLocaleString()} pts
                </div>
                <div className="text-xs text-gray-400 mt-1">👑 Champion</div>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {topThree[2] && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mb-3 mx-auto">
                <span className="text-xl font-bold text-white">3</span>
              </div>
              <div className="bg-[#253935] rounded-lg p-3 min-h-[80px] flex flex-col justify-center">
                <div className="font-bold text-sm truncate text-white">
                  {topThree[2].username || `${topThree[2].walletAddress.slice(0, 6)}...${topThree[2].walletAddress.slice(-4)}`}
                </div>
                <div className="text-[#22cda6] text-xs font-medium">
                  {topThree[2].totalPoints.toLocaleString()} pts
                </div>
                <div className="text-xs text-gray-400 mt-1">Rank #{topThree[2].rank}</div>
              </div>
            </div>
          )}
        </div>

        {/* Ranks 4-10 */}
        {users.slice(3, 10).length > 0 && (
          <div className="grid grid-cols-7 gap-2 mt-4">
            {users.slice(3, 10).map((user: any) => (
              <div key={user.id} className="text-center">
                <div className="w-10 h-10 bg-[#1a2b21] border border-[#22cda6]/30 rounded-full flex items-center justify-center mb-2 mx-auto">
                  <span className="text-xs font-bold text-[#22cda6]">{user.rank}</span>
                </div>
                <div className="bg-[#253935] rounded p-2">
                  <div className="font-medium text-xs truncate text-white">
                    {user.username || `${user.walletAddress.slice(0, 4)}...`}
                  </div>
                  <div className="text-[#22cda6] text-xs font-medium">
                    {user.totalPoints.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Complete Rankings List */}
      <div className="bg-[#253935]">
        <div className="p-4 border-b border-[#22cda6]/20">
          <h3 className="text-lg font-semibold text-white flex items-center">
            {renderIcon('Trophy', 'h-5 w-5 text-[#22cda6] mr-2')}
            Complete Rankings
          </h3>
        </div>
        
        <div className="divide-y divide-[#22cda6]/10 max-h-[600px] overflow-y-auto">
          {/* Show paginated users */}
          {paginatedUsers.map((user: any, index: number) => (
            <div 
              key={user.id} 
              className="p-4 hover:bg-[#1a2b21] transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Rank Badge */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    user.rank <= 3 
                      ? 'bg-gradient-to-br from-[#22cda6] to-[#1a9b99] text-black' 
                      : 'bg-[#1a2b21] text-[#22cda6] border border-[#22cda6]/30'
                  }`}>
                    {user.rank}
                  </div>
                  
                  {/* User Avatar */}
                  <Avatar className="w-10 h-10">
                    {user.avatar && <AvatarImage src={user.avatar} alt={user.username || 'User avatar'} />}
                    <AvatarFallback className="bg-[#1a2b21] text-[#22cda6] text-sm font-medium">
                      {user.walletAddress.slice(2, 4).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">
                        {user.username || `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}
                      </span>
                      
                      {/* Accolades Display */}
                      <div className="mt-1">
                        {renderAccolades(user.accolades || [])}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-1">
                      {user.totalPoints.toLocaleString()} total points
                      {user.accolades && user.accolades.length > 0 && (
                        <span className="ml-2">• {user.accolades.length} achievement{user.accolades.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Points & Rank */}
                <div className="text-right">
                  <div className="font-bold text-[#22cda6] text-lg">
                    {user.totalPoints.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">
                    Rank #{user.rank}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#22cda6]/20 bg-[#1a2b21]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {startIndex + 1}-{Math.min(endIndex, users.length)} of {users.length} users
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="bg-[#253935] border-[#22cda6]/30 text-white hover:bg-[#22cda6]/20"
                >
                  {renderIcon('ChevronLeft', 'h-4 w-4')}
                </Button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className={
                          currentPage === pageNum
                            ? "bg-[#22cda6] text-black hover:bg-[#22cda6]/80"
                            : "bg-[#253935] border-[#22cda6]/30 text-white hover:bg-[#22cda6]/20"
                        }
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="bg-[#253935] border-[#22cda6]/30 text-white hover:bg-[#22cda6]/20"
                >
                  {renderIcon('ChevronRight', 'h-4 w-4')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Current User Position */}
        <div className="border-t border-[#22cda6]/20">
          <div className="p-4 bg-[#22cda6]/10 border border-[#22cda6]/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black bg-[#22cda6]">
                  {currentUser ? currentUser.rank : '?'}
                </div>
                <Avatar className="w-10 h-10">
                  {currentUser?.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser.username || 'Your avatar'} />}
                  <AvatarFallback className="bg-[#22cda6] text-black">
                    {renderIcon('User', 'h-5 w-5')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-white flex items-center">
                    {currentUser 
                      ? `${currentUser.walletAddress.slice(0, 6)}...${currentUser.walletAddress.slice(-4)}`
                      : 'Connect Wallet to See Your Rank'
                    }
                    {currentUser?.accolades?.length > 0 && (
                      <div className="ml-2">
                        {renderAccolades(currentUser.accolades)}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {currentUser 
                      ? `${currentUser.accolades?.length || 0} accolades earned`
                      : 'Track your progress and earn accolades'
                    }
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#22cda6] text-lg">
                  {currentUser ? `${currentUser.totalPoints.toLocaleString()} pts` : '-- pts'}
                </div>
                <div className="text-xs text-gray-400">
                  Rank {currentUser ? `#${currentUser.rank}` : '--'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
