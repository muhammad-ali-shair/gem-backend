import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, Copy, Users, TrendingUp, ExternalLink, Wallet, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { web3Service } from "@/lib/web3";

export default function ReferralPanel() {
  const [copied, setCopied] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [showQualifications, setShowQualifications] = useState(false);
  const { toast } = useToast();

  // Check wallet connection on component mount and set up polling
  useEffect(() => {
    const checkConnection = () => {
      const account = web3Service.getAccount();
      setConnectedWallet(account);
    };
    
    checkConnection();
    
    // Poll for wallet connection changes
    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user profile data for custom referral code
  const { data: profile } = useQuery({
    queryKey: ["/api/profile", connectedWallet],
    queryFn: () => fetch(`/api/profile/${connectedWallet}`).then(res => res.json()),
    enabled: !!connectedWallet,
    staleTime: 30000,
  });

  // Fetch user's referral data
  const { data: referralStats } = useQuery({
    queryKey: ["/api/referrals/stats", connectedWallet],
    queryFn: () => fetch(`/api/referrals/stats/${connectedWallet}`).then(res => res.json()),
    enabled: !!connectedWallet,
    staleTime: 30000,
  });

  // Fetch user's recent referrals
  const { data: recentReferrals = [] } = useQuery({
    queryKey: ["/api/referrals/recent", connectedWallet],
    queryFn: () => fetch(`/api/referrals/recent/${connectedWallet}`).then(res => res.json()),
    enabled: !!connectedWallet,
    staleTime: 30000,
  });

  const connectWallet = async () => {
    try {
      const account = await web3Service.connectWallet();
      setConnectedWallet(account);
      toast({
        title: "Wallet Connected",
        description: `Connected to ${account?.slice(0, 6)}...${account?.slice(-4)}`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Please try again or check your wallet",
        variant: "destructive"
      });
    }
  };

  const copyReferralLink = async () => {
    if (!connectedWallet) return;
    
    // Use custom referral code if available, otherwise use the default referral code
    const referralCode = profile?.customReferralCode || referralStats?.referralCode || connectedWallet.slice(0, 8);
    const referralLink = `https://gemlaunch.io/?ref=${referralCode}`;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive"
      });
    }
  };

  // Show wallet connection prompt if no wallet connected
  if (!connectedWallet) {
    return (
      <div className="space-y-6">
        <Card className="bg-[#253935] border-[#22cda6]/20">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Wallet className="h-16 w-16 mx-auto mb-4 text-[#22cda6]/50" />
              <h3 className="text-xl font-bold text-[#22cda6] mb-2">Connect Your Wallet</h3>
              <p className="text-[#9ca3af] mb-6">
                Connect your wallet to access your referral program and start earning rewards.
              </p>
              <Button 
                onClick={connectWallet}
                className="bg-[#22cda6] hover:bg-[#1fb898] text-black font-bold px-6 py-2"
              >
                <Wallet className="h-5 w-5 mr-2" />
                Connect Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Referral Link Generator */}
      <Card className="bg-[#253935] border-[#22cda6]/20">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center">
            <Link className="h-6 w-6 text-[#22cda6] mr-3" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="bg-[#0f1713] rounded-lg p-4 border border-[#22cda6]/30">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm text-gray-300 truncate mr-4">
                  {connectedWallet ? `https://gemlaunch.io/?ref=${profile?.customReferralCode || referralStats?.referralCode || connectedWallet.slice(0, 8)}` : 'Loading...'}
                </div>
                <Button
                  onClick={copyReferralLink}
                  size="sm"
                  className={`${
                    copied 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-[#22cda6] hover:bg-[#1fb898]"
                  } text-black`}
                  disabled={!connectedWallet}
                >
                  {copied ? "Copied!" : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#22cda6]">
                  {referralStats?.totalReferrals || 0}
                </div>
                <div className="text-sm text-gray-400">Total Referrals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#22cda6]">
                  {referralStats?.totalEarned || 0}
                </div>
                <div className="text-sm text-gray-400">Points Earned</div>
              </div>
            </div>

            <div className="bg-[#0f1713] rounded-lg p-4">
              <h4 className="font-medium mb-2">Referral Rewards</h4>
              <div className="text-sm text-gray-400 space-y-1">
                <div>• 50 points per successful referral</div>
                <div>• 2% of referee's points permanently</div>
                <div>• Bonus multipliers for community leaders</div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-600">
                <button 
                  onClick={() => setShowQualifications(!showQualifications)}
                  className="flex items-center justify-between w-full text-left group hover:bg-gray-700/30 rounded p-2 -m-2 transition-colors"
                >
                  <h5 className="text-xs font-medium text-[#22cda6]">Qualification Requirements</h5>
                  {showQualifications ? (
                    <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-[#22cda6] transition-colors" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-[#22cda6] transition-colors" />
                  )}
                </button>
                {showQualifications && (
                  <div className="text-xs text-gray-500 space-y-1 mt-2 pl-2">
                    <div>Referred user must actively participate:</div>
                    <div>• Min $20 contributed to projects, OR</div>
                    <div>• Create token/launch presale</div>
                    <div className="text-[#22cda6]">Prevents sybil farming attacks</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Referral Stats and Recent Activity */}
      <div className="space-y-6">
        <Card className="bg-[#253935] border-[#22cda6]/20">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-[#22cda6]" />
              Referral Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>This Week</span>
              <Badge variant="outline" className="border-[#22cda6] text-[#22cda6]">
                +{referralStats?.weeklyReferrals || 0} referrals
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>This Month</span>
              <Badge variant="outline" className="border-[#22cda6] text-[#22cda6]">
                +{referralStats?.monthlyReferrals || 0} referrals
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Total Earned</span>
              <span className="text-[#22cda6] font-medium">
                {(referralStats?.totalEarned || 0).toLocaleString()} points
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Total Referrals</span>
              <span className="text-[#22cda6] font-medium">
                {referralStats?.totalReferrals || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#253935] border-[#22cda6]/20">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center">
              <Users className="h-5 w-5 mr-2 text-[#22cda6]" />
              Recent Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentReferrals.length > 0 ? (
              <div className="space-y-3">
                {recentReferrals.map((referral: any) => (
                  <div key={referral.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium text-sm font-mono">
                        {referral.referee.walletAddress.slice(0, 6)}...{referral.referee.walletAddress.slice(-4)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-[#22cda6] text-[#22cda6]">
                      +{referral.pointsEarned} pts
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No referrals yet</p>
                <p className="text-xs mt-1">Share your link to start earning!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
