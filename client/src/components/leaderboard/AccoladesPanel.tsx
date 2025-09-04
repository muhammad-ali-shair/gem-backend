import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Medal, Star, Users, Lock } from "lucide-react";

export default function AccoladesPanel() {
  const { data: accolades } = useQuery({
    queryKey: ["/api/users/1/accolades"], // This would be dynamic based on connected user
    enabled: false, // Disable until we have a connected user
  });

  // Mock accolades for display
  const mockAccolades = [
    {
      id: 1,
      accoladeType: "launch_pioneer",
      level: 1,
      multiplier: "0.10",
      title: "Launch Pioneer",
      description: "5+ successful launches",
      icon: Star,
      color: "yellow",
      unlocked: true
    },
    {
      id: 2,
      accoladeType: "referral_champion",
      level: 1,
      multiplier: "0.05",
      title: "Referral Champion",
      description: "10+ active referrals",
      icon: Users,
      color: "primary",
      unlocked: true
    },
    {
      id: 3,
      accoladeType: "volume_trader",
      level: 1,
      multiplier: "0.15",
      title: "Volume Trader",
      description: "$100K+ volume",
      icon: Lock,
      color: "gray",
      unlocked: false
    }
  ];

  return (
    <Card className="bg-gem-slate border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center">
          <Medal className="h-5 w-5 text-yellow-400 mr-3" />
          Your Accolades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockAccolades.map((accolade) => {
          const IconComponent = accolade.icon;
          
          return (
            <div
              key={accolade.id}
              className={`rounded-lg p-3 border transition-all ${
                accolade.unlocked
                  ? accolade.color === "yellow"
                    ? "bg-gem-dark border-yellow-400/30"
                    : "bg-gem-dark border-primary/30"
                  : "bg-gem-dark/50 border-gray-600/30 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{accolade.title}</div>
                  <div className="text-xs text-gray-400">{accolade.description}</div>
                </div>
                <div className={`flex items-center space-x-1 ${
                  accolade.unlocked
                    ? accolade.color === "yellow"
                      ? "text-yellow-400"
                      : "text-primary"
                    : "text-gray-400"
                }`}>
                  <IconComponent className="h-4 w-4" />
                  <span className="text-xs">
                    {accolade.unlocked 
                      ? `+${(parseFloat(accolade.multiplier) * 100).toFixed(0)}% boost`
                      : "Locked"
                    }
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="text-xs text-gray-500 mt-4 p-2 bg-gem-dark rounded border border-primary/20">
          <strong>Note:</strong> Accolades provide permanent point multipliers and unlock additional rewards. 
          Connect your wallet to track your progress.
        </div>
      </CardContent>
    </Card>
  );
}
