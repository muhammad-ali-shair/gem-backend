import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Camera, 
  Plus, 
  Trash2, 
  Link, 
  Twitter, 
  MessageCircle,
  Globe,
  Wallet,
  Copy,
  Check,
  Edit3,
  Save,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProfilePanelProps {
  connectedWallet: string | null;
}

export default function ProfilePanel({ connectedWallet }: ProfilePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newWalletLabel, setNewWalletLabel] = useState("");
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/profile", connectedWallet],
    queryFn: () => {
      if (!connectedWallet) return Promise.resolve(null);
      return fetch(`/api/profile/${connectedWallet}`).then(res => res.json());
    },
    enabled: !!connectedWallet,
  });

  // Fetch user wallets
  const { data: userWallets } = useQuery({
    queryKey: ["/api/profile/wallets", connectedWallet],
    queryFn: () => {
      if (!connectedWallet) return Promise.resolve([]);
      return fetch(`/api/profile/wallets/${connectedWallet}`).then(res => res.json());
    },
    enabled: !!connectedWallet,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const response = await apiRequest("PUT", `/api/profile/${connectedWallet}`, profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  // Add wallet mutation
  const addWalletMutation = useMutation({
    mutationFn: async (walletData: { address: string; label: string }) => {
      const response = await apiRequest("POST", `/api/profile/wallets/${connectedWallet}`, walletData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/wallets"] });
      setNewWalletAddress("");
      setNewWalletLabel("");
      toast({
        title: "Wallet Added",
        description: "New wallet has been added to your account.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add wallet.",
        variant: "destructive",
      });
    },
  });

  // Compress image and convert to base64
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Set canvas size (max 200x200)
        const maxSize = 200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      const compressedImage = await compressImage(file);
      updateProfileMutation.mutate({ avatar: compressedImage });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image.",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard.`,
    });
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const profileData = {
      username: formData.get('username'),
      displayName: formData.get('displayName'),
      bio: formData.get('bio'),
      twitterHandle: formData.get('twitterHandle'),
      telegramHandle: formData.get('telegramHandle'),
      discordHandle: formData.get('discordHandle'),
      websiteUrl: formData.get('websiteUrl'),
      customReferralCode: formData.get('customReferralCode'),
    };
    updateProfileMutation.mutate(profileData);
  };

  if (!connectedWallet) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Wallet className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold mb-2 text-white">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to access profile settings.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22cda6] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  const referralLink = profile?.customReferralCode 
    ? `https://gemlaunch.io/?ref=${profile.customReferralCode}`
    : `https://gemlaunch.io/?ref=${profile?.referralCode || connectedWallet.slice(0, 8)}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Profile Information */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="bg-[#253935] border-[#22cda6]/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Profile Information</CardTitle>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant={isEditing ? "outline" : "default"}
              size="sm"
              className={isEditing ? "border-[#22cda6] text-[#22cda6]" : "bg-[#22cda6] hover:bg-[#22cda6]/90 text-black"}
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username" className="text-white">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      defaultValue={profile?.username || ""}
                      placeholder="Enter username"
                      className="bg-[#0f1713] border-[#22cda6]/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="displayName" className="text-white">Display Name</Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      defaultValue={profile?.displayName || ""}
                      placeholder="Enter display name"
                      className="bg-[#0f1713] border-[#22cda6]/30 text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="bio" className="text-white">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    defaultValue={profile?.bio || ""}
                    placeholder="Tell us about yourself..."
                    className="bg-[#0f1713] border-[#22cda6]/30 text-white"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="twitterHandle" className="text-white">Twitter Handle</Label>
                    <Input
                      id="twitterHandle"
                      name="twitterHandle"
                      defaultValue={profile?.twitterHandle || ""}
                      placeholder="@username"
                      className="bg-[#0f1713] border-[#22cda6]/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telegramHandle" className="text-white">Telegram Handle</Label>
                    <Input
                      id="telegramHandle"
                      name="telegramHandle"
                      defaultValue={profile?.telegramHandle || ""}
                      placeholder="@username"
                      className="bg-[#0f1713] border-[#22cda6]/30 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discordHandle" className="text-white">Discord Handle</Label>
                    <Input
                      id="discordHandle"
                      name="discordHandle"
                      defaultValue={profile?.discordHandle || ""}
                      placeholder="username#1234"
                      className="bg-[#0f1713] border-[#22cda6]/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="websiteUrl" className="text-white">Website URL</Label>
                    <Input
                      id="websiteUrl"
                      name="websiteUrl"
                      defaultValue={profile?.websiteUrl || ""}
                      placeholder="https://..."
                      className="bg-[#0f1713] border-[#22cda6]/30 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="customReferralCode" className="text-white">Custom Referral Code</Label>
                  <Input
                    id="customReferralCode"
                    name="customReferralCode"
                    defaultValue={profile?.customReferralCode || ""}
                    placeholder="mycustomcode"
                    className="bg-[#0f1713] border-[#22cda6]/30 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Create a custom referral code for influencer campaigns
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-[#22cda6] hover:bg-[#22cda6]/90 text-black"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? "Updating..." : "Save Changes"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Username</Label>
                    <p className="text-white">{profile?.username || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Display Name</Label>
                    <p className="text-white">{profile?.displayName || "Not set"}</p>
                  </div>
                </div>
                
                {profile?.bio && (
                  <div>
                    <Label className="text-gray-400">Bio</Label>
                    <p className="text-white">{profile.bio}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-4">
                  {profile?.twitterHandle && (
                    <div className="flex items-center space-x-2">
                      <Twitter className="h-4 w-4 text-[#22cda6]" />
                      <span className="text-white">{profile.twitterHandle}</span>
                    </div>
                  )}
                  {profile?.telegramHandle && (
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="h-4 w-4 text-[#22cda6]" />
                      <span className="text-white">{profile.telegramHandle}</span>
                    </div>
                  )}
                  {profile?.websiteUrl && (
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-[#22cda6]" />
                      <span className="text-white">{profile.websiteUrl}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Multiple Wallets Management */}
        <Card className="bg-[#253935] border-[#22cda6]/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Wallet className="h-5 w-5 mr-2 text-[#22cda6]" />
              Connected Wallets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current connected wallet */}
            <div className="flex items-center justify-between p-3 bg-[#0f1713] rounded-lg">
              <div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-[#22cda6] text-black">Primary</Badge>
                  <span className="font-mono text-sm text-white">
                    {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Currently connected</p>
              </div>
              <Button
                onClick={() => handleCopy(connectedWallet, "Wallet address")}
                variant="outline"
                size="sm"
                className="border-[#22cda6]/30 text-[#22cda6]"
              >
                {copied === "Wallet address" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            {/* Additional wallets */}
            {userWallets?.map((wallet: any) => (
              <div key={wallet.id} className="flex items-center justify-between p-3 bg-[#0f1713] rounded-lg">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-white">{wallet.label}</span>
                    <span className="font-mono text-sm text-gray-400">
                      {wallet.walletAddress.slice(0, 6)}...{wallet.walletAddress.slice(-4)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleCopy(wallet.walletAddress, `${wallet.label} address`)}
                    variant="outline"
                    size="sm"
                    className="border-[#22cda6]/30 text-[#22cda6]"
                  >
                    {copied === `${wallet.label} address` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Add new wallet */}
            <div className="space-y-3 p-3 border border-[#22cda6]/30 rounded-lg">
              <h4 className="text-sm font-medium text-white">Add Additional Wallet</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Wallet label (e.g., Project Alpha)"
                  value={newWalletLabel}
                  onChange={(e) => setNewWalletLabel(e.target.value)}
                  className="bg-[#0f1713] border-[#22cda6]/30 text-white"
                />
                <Input
                  placeholder="0x..."
                  value={newWalletAddress}
                  onChange={(e) => setNewWalletAddress(e.target.value)}
                  className="bg-[#0f1713] border-[#22cda6]/30 text-white"
                />
              </div>
              <Button
                onClick={() => addWalletMutation.mutate({
                  address: newWalletAddress,
                  label: newWalletLabel
                })}
                disabled={!newWalletLabel || !newWalletAddress || addWalletMutation.isPending}
                className="bg-[#22cda6] hover:bg-[#22cda6]/90 text-black"
              >
                <Plus className="h-4 w-4 mr-2" />
                {addWalletMutation.isPending ? "Adding..." : "Add Wallet"}
              </Button>
              <p className="text-xs text-gray-400">
                Add wallets for different projects. All activities will be tracked under your main account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Avatar */}
        <Card className="bg-[#253935] border-[#22cda6]/20">
          <CardHeader>
            <CardTitle className="text-white">Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="relative mx-auto w-32 h-32 mb-4">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover border-2 border-[#22cda6]"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#0f1713] border-2 border-[#22cda6]/30 flex items-center justify-center">
                  <User className="h-16 w-16 text-gray-400" />
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-[#22cda6] hover:bg-[#22cda6]/90 text-black rounded-full p-2 transition-colors"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <p className="text-xs text-gray-400">
              Upload an image (max 5MB)
            </p>
          </CardContent>
        </Card>

        {/* Referral Link */}
        <Card className="bg-[#253935] border-[#22cda6]/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Link className="h-5 w-5 mr-2 text-[#22cda6]" />
              Referral Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-[#0f1713] rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Your referral link:</p>
              <p className="text-sm font-mono break-all text-white">{referralLink}</p>
            </div>
            <Button
              onClick={() => handleCopy(referralLink, "Referral link")}
              variant="outline"
              className="w-full border-[#22cda6] text-[#22cda6]"
            >
              {copied === "Referral link" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copy Link
            </Button>
            <p className="text-xs text-gray-400">
              Share this link to earn 50 points per qualified referral
            </p>
          </CardContent>
        </Card>

        {/* Account Stats */}
        <Card className="bg-[#253935] border-[#22cda6]/20">
          <CardHeader>
            <CardTitle className="text-white">Account Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Points</span>
              <span className="text-[#22cda6] font-bold">{profile?.totalPoints?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Account Type</span>
              <Badge variant={profile?.isInfluencer ? "default" : "outline"} className="bg-[#22cda6] text-black">
                {profile?.isInfluencer ? "Influencer" : "Standard"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Member Since</span>
              <span className="text-white text-sm">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Unknown"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}