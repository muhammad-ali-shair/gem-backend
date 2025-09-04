import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// import gemmyMascotPath from "@assets/Gemmy_Mascot_1749879808880.png";
import { 
  Trophy, 
  Users, 
  Rocket, 
  TrendingUp, 
  Star, 
  Crown, 
  Link,
  LayoutGrid,
  Coins,
  Send,
  Shield,
  Gift,
  FileText,
  Zap,
  Settings,
  ChevronDown,
  ChevronRight,
  Wallet,
  BarChart3,
  UserPlus,
  Lock,
  Minus,
  ArrowUpDown,
  ArrowRightLeft,
  ShieldCheck,
  Play,
  Info,
  Menu,
  Target
} from "lucide-react";
import { web3Service } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import StatsOverview from "@/components/leaderboard/StatsOverview";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import AccoladesPanel from "@/components/leaderboard/AccoladesPanel";
import ReferralPanel from "@/components/referrals/ReferralPanel";
import ReferralLeaderboard from "@/components/referrals/ReferralLeaderboard";
import ActivitiesPanel from "@/components/activities/ActivitiesPanel";
import ProfilePanel from "@/components/profile/ProfilePanel";
import FeaturedProjectsCarousel from "@/components/featured/FeaturedProjectsCarousel";
import SocialRewardsTab from "@/components/social/SocialRewardsTab";
import { useWebSocket } from "@/hooks/useWebSocket";

import Gemmy_Mascot from "/attached_assets/Gemmy-mascot.png";



import Logo from "/attached_assets/Logo.png";



export default function Leaderboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const { toast } = useToast();
  
  // Connect to WebSocket for real-time updates
  useWebSocket();

  // Auto-connect simulated wallet on component mount
  useEffect(() => {
    const connectSimulatedWallet = async () => {
      const account = await web3Service.connectWallet();
      setConnectedWallet(account);
      
      if (account) {
        // Register/login user in backend
        try {
          const response = await fetch('/api/wallet/connect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ walletAddress: account }),
          });
          
          const data = await response.json();
          console.log("Auto-connected wallet:", data.message);
        } catch (error) {
          console.error("Failed to register wallet:", error);
        }
      }
    };
    
    connectSimulatedWallet();
  }, []);

  const connectWallet = async () => {
    try {
      const account = await web3Service.connectWallet();
      setConnectedWallet(account);
      
      if (account) {
        // Register/login user in backend
        const response = await fetch('/api/wallet/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ walletAddress: account }),
        });
        
        const data = await response.json();
        
        toast({
          title: "Wallet Connected",
          description: data.message || `Connected to ${account?.slice(0, 6)}...${account?.slice(-4)}`,
        });
      }
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      toast({
        title: "Connection Failed", 
        description: error.message || "Failed to connect wallet",
        variant: "destructive"
      });
    }
  };

  const disconnectWallet = () => {
    web3Service.disconnect();
    setConnectedWallet(null);
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  const sidebarItems = [
    { id: 1, icon: LayoutGrid, label: "Home", active: false, hasDropdown: false },
    { id: 2, icon: Target, label: "Create Token", active: false, hasDropdown: false },
    { 
      id: 3, 
      icon: Send, 
      label: "Launchpad", 
      active: false, 
      hasDropdown: true,
      children: [
        { label: "Create Launchpad", href: "/create-launchpad" },
        { label: "Create Fair Launch", href: "/create-fair-launch" },
        { label: "Create Dutch Auction", href: "/create-dutch-auction" },
        { label: "Create Subscription", href: "/create-subscription" },
        { label: "View Pools", href: "/view-pool" }
      ]
    },
    { id: 4, icon: Minus, label: "Exchange", active: false, hasDropdown: false },
    { 
      id: 5, 
      icon: Shield, 
      label: "Private Sale", 
      active: false, 
      hasDropdown: true,
      children: [
        { label: "Create Private Sale", href: "/create-private-sale" },
        { label: "Private Sale List", href: "/private-sale-list" }
      ]
    },
    { 
      id: 6, 
      icon: Lock, 
      label: "Lock", 
      active: false, 
      hasDropdown: true,
      children: [
        { label: "Create Lock", href: "/create-lock" },
        { label: "Token", href: "/token" },
        { label: "Liquidity", href: "/liquidity" }
      ]
    },
    { 
      id: 7, 
      icon: Gift, 
      label: "Airdrop", 
      active: false, 
      hasDropdown: true,
      children: [
        { label: "Create Airdrop", href: "/create-airdrop" },
        { label: "Airdrop List", href: "/airdrop-list" }
      ]
    },
    { id: 8, icon: Crown, label: "Leaderboard", active: true, hasDropdown: false },
    { id: 9, icon: ShieldCheck, label: "Anti-Bot", active: false, hasDropdown: false },
    { id: 10, icon: Play, label: "Multi-Sender", active: false, hasDropdown: false },
    { 
      id: 11, 
      icon: Info, 
      label: "Socials", 
      active: false, 
      hasDropdown: true,
      children: [
        { label: "Twitter", href: "https://x.com/gemlaunchio" },
        { label: "Telegram", href: "https://t.me/gemlaunchio" }
      ]
    },
    { id: 12, icon: Menu, label: "Docs", active: false, hasDropdown: false },
    { id: 13, icon: Settings, label: "Admin", active: false, hasDropdown: false }
  ];

  return (
    <div className="min-h-screen bg-[#0a0f0c] text-white flex">
      {/* Authentic Gemlaunch Sidebar */}
      <div 
        className={`${sidebarExpanded ? 'w-64' : 'w-14'} bg-[#0B1B18] transition-all duration-200 ease-in-out fixed left-0 top-0 h-full z-50 overflow-hidden flex flex-col`}
      >
        {/* Logo Section */}
        <div 
          className="p-4 flex items-center justify-center h-16 cursor-pointer"
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
        >
          <img 
            src={Logo} 
            alt="Gemlaunch" 
            className={`${sidebarExpanded ? 'h-8 w-auto' : 'w-6 h-6'} object-contain pl-[5px] pr-[5px] pt-[5px] pb-[5px]`}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          {sidebarItems.map((item) => (
            <div key={item.id}>
              <div 
                className={`flex items-center px-3 py-2 rounded cursor-pointer transition-all duration-200 group ${
                  item.active 
                    ? "bg-[#22cda6]/20 text-[#22cda6]" 
                    : "text-white hover:bg-[#22cda6]/10"
                }`}
                onClick={() => {
                  if (item.hasDropdown && sidebarExpanded) {
                    setExpandedItems(prev => ({ 
                      ...prev, 
                      [item.id]: !prev[item.id] 
                    }));
                  }
                }}
              >
                <item.icon className={`h-4 w-4 ${!sidebarExpanded ? 'mx-auto' : 'mr-3'}`} />
                {sidebarExpanded && (
                  <>
                    <span className="text-sm font-medium flex-1 font-gilroy-light">{item.label}</span>
                    {item.hasDropdown && (
                      <ChevronRight 
                        className={`h-3 w-3 transition-transform ${
                          expandedItems[item.id] ? 'rotate-90' : ''
                        }`} 
                      />
                    )}
                  </>
                )}
              </div>
              
              {/* Dropdown Items */}
              {item.hasDropdown && expandedItems[item.id] && sidebarExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children?.map((child, childIndex) => (
                    <div 
                      key={childIndex}
                      className="px-3 py-2 text-xs text-gray-300 hover:text-[#22cda6] cursor-pointer rounded transition-colors font-gilroy-light"
                    >
                      {child.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-200 ${sidebarExpanded ? 'ml-64' : 'ml-14'}`}>
        {/* Top Bar - Authentic Gemlaunch Design */}
        <div className="bg-[#0a0f0c] border-b border-[#22cda6]/10 px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center">
              <div className="h-8 flex items-center">
                <img 
                  src="/Logo.png" 
                  alt="Gemlaunch" 
                  className="h-full w-auto"
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling.style.display = 'block';
                  }}
                />
                
              </div>
            </div>
            
            {/* Network Status */}
            <div className="flex-1 flex justify-start">
              {connectedWallet ? (
                <div className="bg-[#22cda6] text-black px-4 py-2 rounded-full text-sm font-medium font-gilroy-light">
                  BSC Mainnet Connected
                </div>
              ) : (
                <div className="bg-transparent border border-[#22cda6] text-[#22cda6] px-4 py-2 rounded-full text-sm font-medium font-gilroy-light">
                  Not Connected
                </div>
              )}
            </div>
            
            {/* Wallet Connection */}
            <div className="flex items-center">
              {connectedWallet ? (
                <div className="flex items-center space-x-3">
                  <div className="bg-[#0f1713] border border-[#22cda6]/20 px-4 py-2 rounded-full">
                    <span className="text-[#22cda6] text-sm font-neue-machina">
                      {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                    </span>
                  </div>
                  <Button
                    onClick={disconnectWallet}
                    variant="outline"
                    size="sm"
                    className="border-[#22cda6]/30 text-[#22cda6] hover:bg-[#22cda6]/10 rounded-full font-gilroy-light"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={connectWallet}
                  className="bg-transparent border border-[#22cda6] text-[#22cda6] hover:bg-[#22cda6] hover:text-black font-medium px-6 py-2 rounded-full transition-all duration-200"
                >
                  Connecting...
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Welcome section with Gemmy */}
            <div className="bg-gradient-to-r from-[#253935] to-[#1a2b21] rounded-lg p-8 border border-[#22cda6]/20 mt-[20px] mb-[20px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={Gemmy_Mascot} 
                      alt="Gemmy Mascot" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-[#22cda6] mb-2 font-gilroy-bold">
                      Welcome to Gemlaunch Rewards Program!
                    </h2>
                    <p className="text-base text-[#9ca3af] mb-3 font-gilroy-light">
                      Earn points for every on-chain activity: token creation, fair launches, presales, contributing to project funding, and referrals. 
                      Build your ranking for exclusive airdrops and rewards.
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-[#22cda6] font-gilroy-light">
                      <span className="flex items-center">
                        <Trophy className="h-4 w-4 mr-1" />
                        Compete for Rankings
                      </span>
                      <span className="flex items-center">
                        <Star className="h-4 w-4 mr-1" />
                        Unlock Accolades
                      </span>
                      <span className="flex items-center">
                        <Gift className="h-4 w-4 mr-1" />
                        Earn Airdrop Priority
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Leaderboard Section */}
            <Tabs defaultValue="leaderboard" className="w-full">
              <TabsList className="grid w-full max-w-lg grid-cols-5 bg-[#253935]">
                <TabsTrigger value="leaderboard" className="data-[state=active]:bg-[#22cda6] data-[state=active]:text-black font-gilroy-light">
                  <Trophy className="h-4 w-4 mr-2" />
                  Leaderboard
                </TabsTrigger>
                <TabsTrigger value="referrals" className="data-[state=active]:bg-[#22cda6] data-[state=active]:text-black font-gilroy-light">
                  <Users className="h-4 w-4 mr-2" />
                  Referrals
                </TabsTrigger>
                <TabsTrigger value="activities" className="data-[state=active]:bg-[#22cda6] data-[state=active]:text-black font-gilroy-light">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Activities
                </TabsTrigger>
                <TabsTrigger value="social" className="data-[state=active]:bg-[#22cda6] data-[state=active]:text-black font-gilroy-light">
                  <Send className="h-4 w-4 mr-2" />
                  Social
                </TabsTrigger>
                <TabsTrigger value="profile" className="data-[state=active]:bg-[#22cda6] data-[state=active]:text-black font-gilroy-light">
                  <Settings className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
              </TabsList>

              <TabsContent value="leaderboard" className="mt-6">
                <div className="space-y-6">
                  {/* Main Leaderboard */}
                  <div className="bg-[#253935] rounded-lg p-6 border border-[#3d5c4d]">
                    <LeaderboardTable />
                  </div>
                  
                  {/* Referral Champions Section */}
                  <div className="bg-[#253935] rounded-lg p-6 border border-[#3d5c4d]">
                    <ReferralLeaderboard />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="referrals" className="mt-6">
                <div className="rounded-lg p-6 border border-[#3d5c4d] bg-[#253935]">
                  <ReferralPanel />
                </div>
              </TabsContent>

              <TabsContent value="activities" className="mt-6">
                <div className="bg-[#253935] rounded-lg p-6 border border-[#3d5c4d]">
                  <ActivitiesPanel />
                </div>
              </TabsContent>

              <TabsContent value="social" className="mt-6">
                <div className="bg-[#253935] rounded-lg p-6 border border-[#3d5c4d]">
                  <SocialRewardsTab />
                </div>
              </TabsContent>

              <TabsContent value="profile" className="mt-6">
                <div className="bg-[#253935] rounded-lg p-6 border border-[#3d5c4d]">
                  <ProfilePanel connectedWallet={connectedWallet} />
                </div>
              </TabsContent>
            </Tabs>

            {/* Featured Projects Carousel */}
            <FeaturedProjectsCarousel />
          </div>
        </div>
      </div>
    </div>
  );
}
