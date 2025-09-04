import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Twitter, MessageCircle, Globe, TrendingUp, Star, Users, Award, ExternalLink, Settings, Zap, Shield } from "lucide-react";

export default function SocialRewardsTab() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Social Campaigns</h1>
        <p className="text-gray-400">
          Complete social media tasks and earn points through community engagement
        </p>
      </div>

      {/* Campaign Status Banner */}
      <Card className="bg-gradient-to-r from-[#22cda6]/10 to-[#22cda6]/5 border-[#22cda6]/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#22cda6]/20 rounded-lg">
                <Zap className="h-5 w-5 text-[#22cda6]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Season 1 Social Campaigns</h3>
                <p className="text-gray-400 text-sm">Launch scheduled for mid-season</p>
              </div>
            </div>
            <Badge variant="outline" className="border-[#22cda6]/50 text-[#22cda6]">
              Coming Soon
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Sweep Widget Integration Area */}
      <Card className="bg-[#253935] border-[#22cda6]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#22cda6]">
            <Award className="h-5 w-5" />
            Social Engagement Hub
          </CardTitle>
          <CardDescription className="text-gray-400">
            Interactive campaigns powered by Sweep Widget technology
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Widget Container - This is where Sweep Widget will be embedded */}
          <div className="bg-[#0f1713] border border-[#22cda6]/30 rounded-lg p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
            <div className="space-y-4 max-w-md">
              <div className="p-4 bg-[#22cda6]/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <Settings className="h-8 w-8 text-[#22cda6]" />
              </div>
              <h3 className="text-xl font-semibold text-white">Integration Ready</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                This area is prepared for Sweep Widget campaign integration. The development team will embed 
                interactive social media campaigns here, allowing users to complete tasks across X, Discord, 
                and other platforms to earn Gemlaunch points.
              </p>
              <div className="pt-4">
                <div className="text-xs text-gray-500 bg-[#253935] rounded-lg p-3">
                  <strong>Developer Note:</strong> Sweep Widget container ready for deployment
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0f1713] border border-[#22cda6]/20 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Twitter className="h-5 w-5 text-[#22cda6]" />
                <h4 className="font-medium text-white">X Campaigns</h4>
              </div>
              <p className="text-sm text-gray-400">Follow, retweet, and mention tasks</p>
              <div className="mt-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-300">Up to 500 points</span>
              </div>
            </div>

            <div className="bg-[#0f1713] border border-[#22cda6]/20 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <MessageCircle className="h-5 w-5 text-[#22cda6]" />
                <h4 className="font-medium text-white">Discord Tasks</h4>
              </div>
              <p className="text-sm text-gray-400">Join servers and engage with community</p>
              <div className="mt-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-gray-300">Up to 300 points</span>
              </div>
            </div>

            <div className="bg-[#0f1713] border border-[#22cda6]/20 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="h-5 w-5 text-[#22cda6]" />
                <h4 className="font-medium text-white">Community Goals</h4>
              </div>
              <p className="text-sm text-gray-400">Collaborative milestone rewards</p>
              <div className="mt-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-sm text-gray-300">Bonus multipliers</span>
              </div>
            </div>
          </div>

          {/* Anti-Sybil Protection Info */}
          <div className="bg-[#0f1713] border border-[#22cda6]/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-[#22cda6] mt-0.5" />
              <div>
                <h4 className="font-medium text-white mb-2">Authenticity Protection</h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                  All social engagement is verified through Sweep Widget's built-in validation system. 
                  This ensures fair rewards distribution and prevents gaming of the system while maintaining 
                  cost-effective operations compared to direct X API integration.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1 border-[#22cda6]/50 text-[#22cda6] hover:bg-[#22cda6]/10"
              disabled
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Launch Campaign
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 border-gray-600 text-gray-400"
              disabled
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure Tasks
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Information */}
      <Card className="bg-[#253935] border-[#22cda6]/20">
        <CardHeader>
          <CardTitle className="text-white">Campaign Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <div>
                <p className="text-white font-medium">Phase 1: Platform Integration</p>
                <p className="text-gray-400 text-sm">Sweep Widget setup and testing - In Progress</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#22cda6]"></div>
              <div>
                <p className="text-white font-medium">Phase 2: Campaign Launch</p>
                <p className="text-gray-400 text-sm">Mid-season deployment with initial task set</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gray-600"></div>
              <div>
                <p className="text-white font-medium">Phase 3: Advanced Features</p>
                <p className="text-gray-400 text-sm">Milestone rewards and community challenges</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}