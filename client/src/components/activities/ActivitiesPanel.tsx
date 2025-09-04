import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Rocket, 
  Flame, 
  Crown, 
  Gavel, 
  DollarSign, 
  Users, 
  TrendingUp,
  Activity,
  Shield,
  ChevronDown,
  ChevronUp,
  Trophy
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { web3Service } from "@/lib/web3";
import { ACCOLADES, RARITY_COLORS } from "@shared/accolades";

export default function ActivitiesPanel() {
  const [showAntiSybilNotice, setShowAntiSybilNotice] = useState(false);
  
  const connectedWallet = web3Service.getAccount();
  
  const { data: recentActivities } = useQuery({
    queryKey: ["/api/activities/recent", connectedWallet],
    queryFn: () => {
      if (!connectedWallet) return Promise.resolve([]);
      return fetch(`/api/activities/recent?wallet=${connectedWallet}`).then(res => res.json());
    },
    refetchInterval: 30000,
  });

  const { data: userAccolades } = useQuery({
    queryKey: ["/api/user/accolades", connectedWallet],
    queryFn: () => {
      if (!connectedWallet) return Promise.resolve([]);
      return fetch(`/api/user/accolades?wallet=${connectedWallet}`).then(res => res.json());
    },
    refetchInterval: 30000,
  });

  // Filter out accolade activities from recent activities - only show point-earning activities
  const pointActivities = Array.isArray(recentActivities) 
    ? recentActivities.filter((activity: any) => activity.activityType !== 'accolade_earned')
    : [];

  const earnedAccoladeIds = new Set((userAccolades || []).map((a: any) => a.accoladeType));

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className={className || "w-5 h-5"} />;
    }
    return <LucideIcons.Award className={className || "w-5 h-5"} />;
  };

  const activityTypes = [
    {
      type: "token_creation",
      title: "Token Creation",
      points: 100,
      description: "Create a new token on Gemlaunch",
      icon: Rocket,
      color: "primary"
    },
    {
      type: "fair_launch",
      title: "Fair Launch",
      points: 250,
      description: "Launch a fair launch campaign",
      icon: Flame,
      color: "green"
    },
    {
      type: "presale",
      title: "Presale Launch",
      points: 300,
      description: "Create and run a presale",
      icon: Crown,
      color: "yellow"
    },
    {
      type: "dutch_auction",
      title: "Dutch Auction",
      points: 200,
      description: "Host a Dutch auction",
      icon: Gavel,
      color: "purple"
    },
    {
      type: "volume_contribution",
      title: "Volume Contribution",
      points: 1,
      description: "Earn points based on funding volume",
      icon: DollarSign,
      color: "primary",
      suffix: "pt / $1"
    },
    {
      type: "referral",
      title: "Successful Referral",
      points: 50,
      description: "User joins and contributes $20+ or creates token/presale",
      icon: Users,
      color: "blue"
    },
    {
      type: "welcome_bonus",
      title: "Welcome Bonus",
      points: 100,
      description: "First-time registration bonus",
      icon: Crown,
      color: "primary"
    },

  ];

  const mockRecentActivities = [
    {
      id: 1,
      activityType: "token_creation",
      points: 100,
      createdAt: "2024-01-15T10:30:00Z",
      user: { username: "You" }
    },
    {
      id: 2,
      activityType: "volume_contribution",
      points: 150,
      createdAt: "2024-01-15T09:15:00Z",
      user: { username: "You" }
    },
    {
      id: 3,
      activityType: "referral",
      points: 50,
      createdAt: "2024-01-14T16:45:00Z",
      user: { username: "You" }
    }
  ];

  const getActivityIcon = (type: string) => {
    const activity = activityTypes.find(a => a.type === type);
    return activity?.icon || Activity;
  };

  const getActivityColor = (type: string) => {
    const activity = activityTypes.find(a => a.type === type);
    const colorMap = {
      primary: "text-primary",
      green: "text-green-400",
      yellow: "text-yellow-400",
      purple: "text-purple-400",
      blue: "text-blue-400"
    };
    return colorMap[activity?.color as keyof typeof colorMap] || "text-primary";
  };

  return (
    <div className="space-y-8">
      {/* First Row: Point Earning Activities and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Point Sources */}
        <div className="lg:col-span-2">
          <Card className="bg-gem-slate border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center">
              <TrendingUp className="h-6 w-6 text-primary mr-3" />
              Point Earning Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activityTypes.map((activity) => {
              const IconComponent = activity.icon;
              
              return (
                <div
                  key={activity.type}
                  className={`bg-gem-dark rounded-lg p-4 border transition-all hover:border-opacity-60 ${
                    activity.color === "primary" ? "border-primary/20" :
                    activity.color === "green" ? "border-green-400/20" :
                    activity.color === "yellow" ? "border-yellow-400/20" :
                    activity.color === "purple" ? "border-purple-400/20" :
                    activity.color === "blue" ? "border-blue-400/20" :
                    "border-primary/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <IconComponent className={`h-5 w-5 mr-3 ${getActivityColor(activity.type)}`} />
                      <span className="font-medium">{activity.title}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`font-bold ${
                        activity.color === "primary" ? "border-primary text-primary" :
                        activity.color === "green" ? "border-green-400 text-green-400" :
                        activity.color === "yellow" ? "border-yellow-400 text-yellow-400" :
                        activity.color === "purple" ? "border-purple-400 text-purple-400" :
                        activity.color === "blue" ? "border-blue-400 text-blue-400" :
                        "border-primary text-primary"
                      }`}
                    >
                      {activity.points} {activity.suffix || "pts"}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-400">{activity.description}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Accolades Earned */}
        <Card className="bg-gem-slate border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center">
              <Crown className="h-5 w-5 mr-2 text-[#22cda6]" />
              Accolades Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userAccolades && userAccolades.length > 0 ? (
              <div className="space-y-3">
                {userAccolades.map((accolade: any) => {
                  const formattedDate = new Date(accolade.unlockedAt || accolade.unlocked_at).toLocaleDateString();
                  const accoladeData = ACCOLADES.find(a => a.id === accolade.accoladeType);
                  
                  return (
                    <div key={accolade.id} className="flex items-start space-x-3 py-2">
                      <div className="text-2xl">
                        {accoladeData ? renderIcon(accoladeData.icon, 'w-6 h-6') : renderIcon('Award', 'w-6 h-6')}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[#22cda6]">
                          {accoladeData?.name || 'Unknown Accolade'}
                        </div>
                        <div className="text-xs text-gray-400">{formattedDate}</div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="text-sm font-medium text-[#22cda6] border-[#22cda6]"
                      >
                        +{accoladeData?.pointsBonus || 0} pts
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <Crown className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No accolades yet</p>
                <p className="text-xs mt-1">Achieve milestones to earn recognition!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-gem-slate border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center">
              <Activity className="h-5 w-5 mr-2 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#22CDA6] scrollbar-thumb-rounded-full">
              <div className="p-6 space-y-3">
                {pointActivities && pointActivities.length > 0 ? (
                  pointActivities.slice(0, 5).map((activity) => {
                    const IconComponent = getActivityIcon(activity.activityType);
                    const formattedTime = new Date(activity.createdAt).toLocaleDateString();
                    
                    return (
                      <div key={activity.id} className="flex items-start space-x-3 py-2">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          getActivityColor(activity.activityType).replace('text-', 'bg-')
                        }`} />
                        <div className="flex-1">
                          <div className="text-sm capitalize">
                            {activity.activityType.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-gray-400">{formattedTime}</div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-sm font-medium ${getActivityColor(activity.activityType)} border-current`}
                        >
                          +{activity.points}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No point activities yet</p>
                    <p className="text-xs mt-1">Start using Gemlaunch to earn points!</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anti-Sybil Notice */}
        <Card className="bg-[#253935]/80 border border-[#22cda6]/30">
          <CardHeader>
            <Button
              variant="ghost"
              onClick={() => setShowAntiSybilNotice(!showAntiSybilNotice)}
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <CardTitle className="text-sm font-bold flex items-center text-[#22cda6]">
                <Shield className="h-4 w-4 mr-2" />
                Fair Distribution Notice
              </CardTitle>
              {showAntiSybilNotice ? (
                <ChevronUp className="h-4 w-4 text-[#22cda6]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#22cda6]" />
              )}
            </Button>
          </CardHeader>
          {showAntiSybilNotice && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                <p className="text-[#9ca3af] text-xs leading-relaxed">
                  Users can connect multiple wallets to consolidate their legitimate activities under one account. This multi-wallet 
                  feature helps verify authentic participation from the same entity across different addresses. Comprehensive anti-sybil 
                  analysis will be conducted to identify coordinated farming attempts, artificial transaction patterns, or ecosystem 
                  manipulation while preserving rewards for genuine users with multiple wallets.
                </p>
                <p className="text-[#22cda6] text-xs font-medium">
                  Authentic participation across your connected wallets is rewarded. Sybil farming across separate accounts is not.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
      </div>

      {/* Full Width Available Accolades Section */}
      <div className="w-full">
        <Card className="bg-[#253935] border-[#22cda6]/30">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center text-white">
              {renderIcon('Trophy', 'h-6 w-6 mr-3 text-[#22cda6]')}
              Available Accolades
            </CardTitle>
            <p className="text-gray-400 text-sm">
              Unlock achievements by participating in the Gemlaunch ecosystem. Each accolade grants bonus points and special recognition.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ACCOLADES.map((accolade) => {
                const isEarned = earnedAccoladeIds.has(accolade.id);
                const rarityColor = RARITY_COLORS[accolade.rarity];
                
                return (
                  <Card 
                    key={accolade.id}
                    className={`bg-[#0f1713] border transition-all hover:border-opacity-60 ${
                      isEarned 
                        ? 'border-[#22cda6] shadow-lg shadow-[#22cda6]/20' 
                        : 'border-[#3d5c4d] opacity-75'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`text-2xl ${isEarned ? '' : 'grayscale opacity-50'}`}>
                            {renderIcon(accolade.icon, 'w-8 h-8')}
                          </div>
                          <div>
                            <CardTitle className={`text-lg ${isEarned ? 'text-[#22cda6]' : 'text-gray-300'}`}>
                              {accolade.name}
                            </CardTitle>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge 
                                variant="outline" 
                                style={{ 
                                  borderColor: rarityColor,
                                  color: rarityColor 
                                }}
                                className="text-xs"
                              >
                                {accolade.rarity}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-[#22cda6] text-[#22cda6]">
                                {accolade.category}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {isEarned && (
                          <div className="text-[#22cda6]">
                            {renderIcon('Crown', 'h-5 w-5')}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-400 mb-3">
                        {accolade.description}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500 font-medium">
                          HOW TO UNLOCK:
                        </div>
                        <div className="text-sm text-gray-300">
                          {accolade.criteria}
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                          <div className="text-sm">
                            <span className="text-gray-400">Reward: </span>
                            <span className="text-[#22cda6] font-medium">+{accolade.pointsBonus} pts</span>
                          </div>
                          {accolade.multiplier && (
                            <div className="text-sm">
                              <span className="text-yellow-400">{accolade.multiplier}x multiplier</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
