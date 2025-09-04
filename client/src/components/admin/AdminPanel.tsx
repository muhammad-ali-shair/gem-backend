import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  Settings, 
  Activity, 
  Database, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PointConfigUpdate {
  activityType: string;
  basePoints: number;
}

interface UserPointAdjustment {
  walletAddress: string;
  points: number;
  reason: string;
}

export default function AdminPanel() {
  const [userAddress, setUserAddress] = useState("");
  const [pointAdjustment, setPointAdjustment] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [selectedConfig, setSelectedConfig] = useState("");
  const [newPointValue, setNewPointValue] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch point configurations
  const { data: pointConfigs, isLoading: configsLoading } = useQuery({
    queryKey: ["/api/point-configs"],
  });

  // Fetch blockchain status
  const { data: blockchainStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/blockchain/status"],
    refetchInterval: 10000,
  });

  // Fetch recent activities for monitoring
  const { data: recentActivities } = useQuery({
    queryKey: ["/api/activities/recent"],
    refetchInterval: 5000,
  });

  // Update point configuration mutation
  const updatePointConfigMutation = useMutation({
    mutationFn: async ({ activityType, basePoints }: PointConfigUpdate) => {
      const response = await apiRequest("PUT", `/api/point-configs/${activityType}`, { 
        basePoints 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/point-configs"] });
      setSelectedConfig("");
      setNewPointValue("");
      toast({
        title: "Configuration Updated",
        description: "Point values have been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update configuration.",
        variant: "destructive",
      });
    },
  });

  // User point adjustment mutation
  const adjustUserPointsMutation = useMutation({
    mutationFn: async ({ walletAddress, points, reason }: UserPointAdjustment) => {
      // First, get or create user
      const userResponse = await apiRequest("POST", "/api/users", { 
        walletAddress 
      });
      const user = await userResponse.json();
      
      // Then create activity
      const response = await apiRequest("POST", "/api/activities", {
        userId: user.id,
        activityType: "manual_adjustment",
        points: points,
        metadata: { reason, adminAdjustment: true }
      });
      return response.json();
    },
    onSuccess: () => {
      setUserAddress("");
      setPointAdjustment("");
      setAdjustmentReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/recent"] });
      toast({
        title: "Points Adjusted",
        description: "User points have been successfully modified.",
      });
    },
    onError: (error) => {
      toast({
        title: "Adjustment Failed",
        description: error instanceof Error ? error.message : "Failed to adjust user points.",
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
      queryClient.invalidateQueries({ queryKey: ["/api/blockchain/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/recent"] });
      toast({
        title: "Events Processed",
        description: "All pending blockchain events have been processed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process blockchain events.",
        variant: "destructive",
      });
    },
  });

  const handlePointConfigUpdate = () => {
    const basePoints = parseInt(newPointValue);
    if (!selectedConfig || isNaN(basePoints) || basePoints < 0) {
      toast({
        title: "Invalid Input",
        description: "Please select an activity and provide a valid point value.",
        variant: "destructive",
      });
      return;
    }

    updatePointConfigMutation.mutate({ 
      activityType: selectedConfig, 
      basePoints 
    });
  };

  const handleUserPointAdjustment = () => {
    const points = parseInt(pointAdjustment);
    if (!userAddress || isNaN(points) || !adjustmentReason.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please provide a wallet address, point adjustment, and reason.",
        variant: "destructive",
      });
      return;
    }

    adjustUserPointsMutation.mutate({ 
      walletAddress: userAddress, 
      points, 
      reason: adjustmentReason 
    });
  };

  const getStatusColor = (isConnected: boolean) => {
    return isConnected ? "text-green-400" : "text-red-400";
  };

  const getStatusIcon = (isConnected: boolean) => {
    return isConnected ? CheckCircle : XCircle;
  };

  return (
    <div className="space-y-8">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">System Status</p>
                <p className="text-2xl font-bold text-red-400">ADMIN MODE</p>
              </div>
              <Shield className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gem-slate border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Recent Activities</p>
                <p className="text-2xl font-bold text-primary">
                  {recentActivities?.length || 0}
                </p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gem-slate border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Blockchain Status</p>
                <p className={`text-2xl font-bold ${getStatusColor(blockchainStatus?.isConnected || false)}`}>
                  {blockchainStatus?.isConnected ? "CONNECTED" : "OFFLINE"}
                </p>
              </div>
              <Database className={`h-8 w-8 ${getStatusColor(blockchainStatus?.isConnected || false)}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Point Configuration Management */}
        <Card className="bg-red-900/20 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Point Configuration Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Configurations Display */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Current Point Values</Label>
              {configsLoading ? (
                <div className="text-center py-4 text-gray-400">Loading configurations...</div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {pointConfigs?.map((config: any) => (
                    <div key={config.activityType} className="flex justify-between items-center p-2 bg-gem-dark rounded border border-primary/20">
                      <span className="text-sm capitalize">
                        {config.activityType.replace('_', ' ')}
                      </span>
                      <Badge variant="outline" className="border-primary text-primary">
                        {config.basePoints} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator className="bg-red-500/30" />

            {/* Configuration Update Form */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Update Configuration</Label>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="activitySelect" className="text-xs text-gray-400">Activity Type</Label>
                  <Select value={selectedConfig} onValueChange={setSelectedConfig}>
                    <SelectTrigger className="bg-gem-dark border-primary/30">
                      <SelectValue placeholder="Select activity type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gem-dark border-primary/30">
                      {pointConfigs?.map((config: any) => (
                        <SelectItem key={config.activityType} value={config.activityType}>
                          {config.activityType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="pointValue" className="text-xs text-gray-400">New Point Value</Label>
                  <Input
                    id="pointValue"
                    type="number"
                    placeholder="e.g., 500"
                    value={newPointValue}
                    onChange={(e) => setNewPointValue(e.target.value)}
                    className="bg-gem-dark border-primary/30"
                    min="0"
                  />
                </div>

                <Button
                  onClick={handlePointConfigUpdate}
                  disabled={updatePointConfigMutation.isPending || !selectedConfig || !newPointValue}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {updatePointConfigMutation.isPending ? "Updating..." : "Update Configuration"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Point Management */}
        <Card className="bg-red-900/20 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              User Point Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="userAddress" className="text-xs text-gray-400">Wallet Address</Label>
                <Input
                  id="userAddress"
                  placeholder="0x..."
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  className="bg-gem-dark border-primary/30 font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="pointAdjustment" className="text-xs text-gray-400">Point Adjustment</Label>
                <Input
                  id="pointAdjustment"
                  type="number"
                  placeholder="e.g., +500 or -200"
                  value={pointAdjustment}
                  onChange={(e) => setPointAdjustment(e.target.value)}
                  className="bg-gem-dark border-primary/30"
                />
                <p className="text-xs text-gray-500 mt-1">Use positive values to add points, negative to subtract</p>
              </div>

              <div>
                <Label htmlFor="adjustmentReason" className="text-xs text-gray-400">Reason for Adjustment</Label>
                <Textarea
                  id="adjustmentReason"
                  placeholder="Explain why this adjustment is being made..."
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="bg-gem-dark border-primary/30 min-h-[80px]"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">{adjustmentReason.length}/500 characters</p>
              </div>

              <Button
                onClick={handleUserPointAdjustment}
                disabled={adjustUserPointsMutation.isPending || !userAddress || !pointAdjustment || !adjustmentReason.trim()}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {adjustUserPointsMutation.isPending ? "Processing..." : "Apply Point Adjustment"}
              </Button>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-200">
                  <strong>Warning:</strong> Point adjustments are permanent and will appear in the user's activity history. 
                  Always provide a clear reason for audit purposes.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blockchain Integration Status */}
        <Card className="bg-red-900/20 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Blockchain Integration Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusLoading ? (
              <div className="text-center py-4 text-gray-400">Loading blockchain status...</div>
            ) : blockchainStatus ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Connection</span>
                      <div className="flex items-center space-x-2">
                        {React.createElement(getStatusIcon(blockchainStatus.isConnected), {
                          className: `h-4 w-4 ${getStatusColor(blockchainStatus.isConnected)}`
                        })}
                        <span className={`text-xs font-medium ${getStatusColor(blockchainStatus.isConnected)}`}>
                          {blockchainStatus.isConnected ? "Connected" : "Disconnected"}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Events Processed</span>
                      <span className="text-primary font-mono text-sm">
                        {blockchainStatus.eventsProcessed.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Current Block</span>
                      <span className="text-primary font-mono text-xs">
                        #{blockchainStatus.lastBlockNumber.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Last Update</span>
                      <span className="text-gray-400 text-xs">
                        {new Date(blockchainStatus.lastUpdate).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-red-500/30" />

                <div className="space-y-3">
                  <Button
                    onClick={() => processEventsMutation.mutate()}
                    disabled={processEventsMutation.isPending}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {processEventsMutation.isPending ? "Processing..." : "Process Pending Events"}
                  </Button>

                  <div className="text-xs text-gray-500 text-center">
                    Manually trigger blockchain event processing to sync latest on-chain activities
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-red-400">
                <XCircle className="h-12 w-12 mx-auto mb-3" />
                <p className="text-sm">Unable to load blockchain status</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Information & Security */}
        <Card className="bg-red-900/20 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400">System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Network:</span>
                  <Badge variant="outline" className="border-primary text-primary text-xs">
                    BNB Chain
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Point Rounding:</span>
                  <span className="text-gray-300">Nearest 1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Top Rewards:</span>
                  <span className="text-yellow-400">Top 10</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Referral Rate:</span>
                  <span className="text-gray-300">2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Base Referral:</span>
                  <span className="text-gray-300">500 pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Volume Rate:</span>
                  <span className="text-gray-300">1 pt/$1</span>
                </div>
              </div>
            </div>

            <Separator className="bg-red-500/30" />

            <div className="bg-red-950/50 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-red-200 space-y-2">
                  <p><strong>SECURITY NOTICE:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>All administrative actions are logged and auditable</li>
                    <li>Point adjustments are immediately reflected in the live system</li>
                    <li>Configuration changes affect all future point calculations</li>
                    <li>Exercise extreme caution when modifying user balances</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
