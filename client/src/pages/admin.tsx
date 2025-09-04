import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Shield, Settings, Activity, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Admin() {
  const [userAddress, setUserAddress] = useState("");
  const [pointAdjustment, setPointAdjustment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch point configurations
  const { data: pointConfigs, isLoading } = useQuery({
    queryKey: ["/api/point-configs"],
  });

  // Fetch blockchain status
  const { data: blockchainStatus } = useQuery({
    queryKey: ["/api/blockchain/status"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Update point configuration mutation
  const updatePointConfigMutation = useMutation({
    mutationFn: async ({ activityType, basePoints }: { activityType: string; basePoints: number }) => {
      const response = await apiRequest("PUT", `/api/point-configs/${activityType}`, { basePoints });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/point-configs"] });
      toast({
        title: "Point configuration updated",
        description: "The point values have been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update point configuration.",
        variant: "destructive",
      });
    },
  });

  // User point adjustment mutation
  const adjustUserPointsMutation = useMutation({
    mutationFn: async ({ walletAddress, points }: { walletAddress: string; points: number }) => {
      const response = await apiRequest("POST", "/api/activities", {
        userId: 1, // This would need to be resolved from wallet address
        activityType: "manual_adjustment",
        points: points,
        metadata: { reason: "Admin adjustment" }
      });
      return response.json();
    },
    onSuccess: () => {
      setUserAddress("");
      setPointAdjustment("");
      toast({
        title: "Points adjusted",
        description: "User points have been successfully adjusted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to adjust user points.",
        variant: "destructive",
      });
    },
  });

  // Process blockchain events mutation
  const processEventsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/blockchain/process-events");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Events processed",
        description: "All pending blockchain events have been processed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process blockchain events.",
        variant: "destructive",
      });
    },
  });

  // Monitor Gemlaunch contracts mutation
  const monitorGemlaunchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/blockchain/monitor-gemlaunch");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/blockchain/status"] });
      toast({
        title: "Gemlaunch monitoring completed",
        description: "Scanned all real contract addresses for authentic activity.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to monitor Gemlaunch contracts.",
        variant: "destructive",
      });
    },
  });

  const handlePointConfigUpdate = (activityType: string, newValue: string) => {
    const basePoints = parseInt(newValue);
    if (isNaN(basePoints) || basePoints < 0) return;

    updatePointConfigMutation.mutate({ activityType, basePoints });
  };

  const handleUserPointAdjustment = () => {
    const points = parseInt(pointAdjustment);
    if (!userAddress || isNaN(points)) {
      toast({
        title: "Invalid input",
        description: "Please provide a valid wallet address and point adjustment.",
        variant: "destructive",
      });
      return;
    }

    adjustUserPointsMutation.mutate({ walletAddress: userAddress, points });
  };

  return (
    <div className="min-h-screen bg-gem-dark text-white">
      {/* Navigation Header */}
      <nav className="bg-gem-slate border-b border-red-500/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-red-400">Admin Panel</span>
          </div>
          <Badge variant="destructive" className="bg-red-600">
            Administrative Access
          </Badge>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-red-400 mb-2 flex items-center">
            <Shield className="h-8 w-8 mr-3" />
            Point Management System
          </h1>
          <p className="text-gray-400">
            Configure point values and manage user scores for the Gemlaunch rewards system.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Point Value Adjustments */}
          <Card className="bg-red-900/20 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Point Value Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="text-center py-4">Loading configurations...</div>
              ) : Array.isArray(pointConfigs) ? (
                pointConfigs.map((config: any) => (
                  <div key={config.activityType} className="flex items-center justify-between">
                    <Label className="text-sm capitalize">
                      {config.activityType.replace('_', ' ')}:
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        defaultValue={config.basePoints}
                        className="w-24 bg-gem-dark border-primary/30"
                        onBlur={(e) => {
                          if (e.target.value !== config.basePoints.toString()) {
                            handlePointConfigUpdate(config.activityType, e.target.value);
                          }
                        }}
                      />
                      <span className="text-xs text-gray-400">pts</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-400">No configurations found</div>
              )}
            </CardContent>
          </Card>

          {/* User Point Adjustment */}
          <Card className="bg-red-900/20 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Manual Point Adjustment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="userAddress" className="text-sm">Wallet Address</Label>
                <Input
                  id="userAddress"
                  placeholder="0x..."
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  className="bg-gem-dark border-primary/30"
                />
              </div>
              <div>
                <Label htmlFor="pointAdjustment" className="text-sm">Point Adjustment (+/-)</Label>
                <Input
                  id="pointAdjustment"
                  type="number"
                  placeholder="e.g., +500 or -200"
                  value={pointAdjustment}
                  onChange={(e) => setPointAdjustment(e.target.value)}
                  className="bg-gem-dark border-primary/30"
                />
              </div>
              <Button
                onClick={handleUserPointAdjustment}
                disabled={adjustUserPointsMutation.isPending}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {adjustUserPointsMutation.isPending ? "Applying..." : "Apply Adjustment"}
              </Button>
            </CardContent>
          </Card>

          {/* Blockchain Status */}
          <Card className="bg-red-900/20 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Blockchain Integration Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {blockchainStatus ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Connection Status</span>
                    <Badge 
                      variant={blockchainStatus?.isConnected ? "default" : "destructive"}
                      className={blockchainStatus?.isConnected ? "bg-green-600" : "bg-red-600"}
                    >
                      {blockchainStatus?.isConnected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Last Block</span>
                    <span className="text-primary font-mono">
                      #{blockchainStatus?.lastBlockNumber?.toLocaleString() || "0"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Events Processed</span>
                    <span className="text-primary font-mono">
                      {blockchainStatus?.eventsProcessed?.toLocaleString() || "0"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Last Update</span>
                    <span className="text-gray-400 text-xs">
                      {blockchainStatus?.lastUpdate ? new Date(blockchainStatus.lastUpdate).toLocaleTimeString() : "Never"}
                    </span>
                  </div>
                  <Separator className="bg-red-500/30" />
                  <Button
                    onClick={() => processEventsMutation.mutate()}
                    disabled={processEventsMutation.isPending}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {processEventsMutation.isPending ? "Processing..." : "Process Pending Events"}
                  </Button>
                  
                  <Button
                    onClick={() => monitorGemlaunchMutation.mutate()}
                    disabled={monitorGemlaunchMutation.isPending}
                    className="w-full bg-[#22cda6] hover:bg-[#22cda6]/90 text-black"
                  >
                    {monitorGemlaunchMutation.isPending ? "Monitoring..." : "Monitor Gemlaunch Contracts"}
                  </Button>
                  
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>Real Contract Addresses:</div>
                    <div className="font-mono">Fair Launch: 0x63fd...BA9DA</div>
                    <div className="font-mono">Dutch Auction: 0x120d...575bd</div>
                    <div className="font-mono">Private Sale: 0xFA19...B9427</div>
                    <div className="font-mono">Token Factory: 0x3D61...C427</div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  Loading blockchain status...
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="bg-red-900/20 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400">System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Network</span>
                <Badge variant="outline" className="border-primary text-primary">
                  BNB Chain
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Point Rounding</span>
                <span className="text-gray-400">Nearest 1</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Top Rewards</span>
                <span className="text-yellow-400">Top 10</span>
              </div>
              <div className="text-xs text-gray-500 mt-4 p-3 bg-gem-dark rounded border border-red-500/20">
                <strong>Warning:</strong> All changes made here are immediately applied to the live system. 
                Exercise caution when adjusting point values or user scores.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
