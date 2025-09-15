import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { blockchainService } from "./services/blockchain";
// Social services removed - Sweep Widget integration will replace X API functionality
import {
  insertUserSchema,
  insertActivitySchema,
  insertPointConfigSchema,
  gemAccolades,
  User,
} from "@shared/schema";
import { z } from "zod";
import { socialMediaAnalyzer } from "./services/ai";
import { eq } from "drizzle-orm";
import { insertAccolade } from "./services/insertAccolade";
import { accoladeQueue } from "./queues/accoladeQueue";
import { checkFairLaunchSuccess, convertBNBtoUSDC, countSuccessfulLaunchpads, createAccoladeLog, getAccoladeTypesByUser, getAllAccoladesForUser, getTotalRaisedInBNB, getUserAccoladesHistory, isAnyFairLaunchSuccessful, markUserAccolades, runGraphQLQuery, sendResponse } from "./helpers";
import { useTransition } from "react";
// import { redis } from "./redis/conectionCheck";

//waseem
  const LAUNCHPAD_SUBGRAPH = "https://api.studio.thegraph.com/query/120543/launchpad-gempad-bsc/0.0.4"
  const FAIRLAUCH_SUBGRAPH = "https://api.studio.thegraph.com/query/120543/fairlaunch-gempad-bsc/0.0.6";
  const GRAPHQL_URL_TOKEN = "https://api.studio.thegraph.com/query/120239/indexing-gempad-usdc/0.0.4";
//


const GRAPHQL_URL = "https://api.studio.thegraph.com/query/120239/gempad/0.0.3";

const GRAPHQL_URL_LaunchPads =
  "https://api.studio.thegraph.com/query/120239/launchpad-subgraph/0.0.2";
const TOKENS_SUBGRPH = "https://api.studio.thegraph.com/query/120239/launchpad-subgraph/0.0.2"
export async function registerRoutes(app: Express): Promise<Server> {
  

  app.post("/api/get/first-funder", async (req, res) => {
    const { owner } = req.body;

    if (!owner) {
      return res.status(400).json({ error: "Owner address is required" });
    }

    // GraphQL query to check launchpads created by this owner
    const query = `
      query ($owner: String!) {
        launchpadCreateds(where: { launchpad: $owner }) {
          id
          info_token
          info_softCap
          info_hardCap
        }
        fairLaunchCreateds(where: { fairLaunch: $owner }) {
          id
          _info_token
          _info_softCap
          _info_totalsellTokens
        }
      }
    `;

    try {
      const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { owner } }),
      });

      const data = await response.json();
      const launchpads = data.data.launchpadCreateds;
      const fairLaunches = data.data.fairLaunchCreateds;

      let user = await storage.getUserByWalletAddress(owner);

      if (!user) {
        const referralCode = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();
        user = await storage.createUser({
          walletAddress: owner,
          totalPoints: 0,
          referralCode,
          referredBy: null,
        });
      }

      // First Funder: Fund your first token launch
      if (launchpads.length >= 1) {
        await insertAccolade(user, "first_funding");
      }

      // Launch Master: Successfully completed a fair launch
      if (fairLaunches.length >= 1) {
        await insertAccolade(user, "launch_master");
      }

      return res.json({ launchpads, fairLaunches });
    } catch (error) {
      console.error("GraphQL fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch data" });
    }
  });
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByWalletAddress(
        userData.walletAddress
      );

      if (existingUser) {
        return res.json(existingUser);
      }

      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid user data",
      });
    }
  });

  app.get("/api/users/:walletAddress", async (req, res) => {
    try {
      const user = await storage.getUserByWalletAddress(
        req.params.walletAddress
      );
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  // Leaderboard routes
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const leaderboard = await storage.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/users/:id/rank", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const rank = await storage.getUserRank(userId);
      res.json({ rank });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user rank" });
    }
  });
  // Activity routes
  app.post("/api/activities", async (req, res) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(activityData);

      // Broadcast activity update via WebSocket
      broadcastUpdate({ type: "activity", data: activity });

      res.json(activity);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid activity data",
      });
    }
  });

  app.get("/api/users/:id/activities", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      const activities = await storage.getUserActivities(userId, limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user activities" });
    }
  });
// waseem
  app.get("/api/activities/recent/:walletAddress", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      // Only show activities for connected wallet if specified
      const { walletAddress } = req.params;
      if (walletAddress) {
        const user = await storage.getUserByWalletAddress(walletAddress);
        if (user) {
          const activities = await getUserAccoladesHistory({userId: user.id.toString(), limit, page: 1});
          // Filter out accolade activities to show only point-earning activities
          return res.status(200).json(
           { status: 200, message: "History fetched successfully", data: {activities}}
          );
        }
      }
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent activities" });
    }
  });
  // Referral routes
  app.get("/api/users/:id/referrals", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const referrals = await storage.getUserReferrals(userId);
      res.json(referrals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch referrals" });
    }
  });

  app.get("/api/users/:id/referral-stats", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const stats = await storage.getReferralStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch referral stats" });
    }
  });
  // Accolade routes
  app.get("/api/users/:id/accolades", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const accolades = await storage.getUserAccolades(userId);
      res.json(accolades);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accolades" });
    }
  });
  // Get current user's accolades
  app.get("/api/user/accolades", async (req, res) => {
    try {
      const walletAddress = req.query.wallet as string;
      if (!walletAddress) {
        return res.json([]);
      }

      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        return res.json([]);
      }

      const accolades = await storage.getUserAccolades(user.id);
      res.json(accolades);
    } catch (error) {
      console.error("Error fetching user accolades:", error);
      res.status(500).json({ error: "Failed to fetch accolades" });
    }
  });
  // Point configuration routes (admin)
  app.get("/api/point-configs", async (req, res) => {
    try {
      const configs = await storage.getPointConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch point configs" });
    }
  });

  app.put("/api/point-configs/:activityType", async (req, res) => {
    try {
      const { activityType } = req.params;
      const { basePoints } = req.body;

      if (!basePoints || basePoints < 0) {
        return res.status(400).json({ error: "Invalid base points value" });
      }

      await storage.updatePointConfig(activityType, basePoints);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update point config" });
    }
  });
  // Blockchain monitoring routes
  app.get("/api/blockchain/status", async (req, res) => {
    try {
      const status = blockchainService.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get blockchain status" });
    }
  });

  app.post("/api/blockchain/process-events", async (req, res) => {
    try {
      await blockchainService.processEvents();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to process blockchain events" });
    }
  });
  // Monitor real Gemlaunch contracts for authentic activity
  app.post("/api/blockchain/monitor-gemlaunch", async (req, res) => {
    try {
      await blockchainService.monitorGemlaunchContracts();
      const status = blockchainService.getStatus();
      res.json({
        success: true,
        status,
        message: "Gemlaunch contract monitoring completed",
        contracts: [
          "Fair Launch: 0x63fddF231BA74CEaA3D061b67FC08af2dFbBA9DA",
          "Dutch Auction: 0x120d0166b1c132Cdaa2307549568634fd3F575bd",
          "Private Sale: 0xFA19F2Fb64Fc9cbdBA7407b573a6B82E0d6f1427",
          "Token Factory: 0x3D61f62213EcE0917Abf64c6119D29C9dc18C427",
        ],
      });
    } catch (error) {
      console.error("Gemlaunch monitoring error:", error);
      res.status(500).json({ error: "Failed to monitor Gemlaunch contracts" });
    }
  });
  // Get user referral stats
  app.get("/api/referrals/stats/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWalletAddress(walletAddress);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const referralStats = await storage.getReferralStats(user.id);
      res.json({
        referralCode: user.referralCode,
        totalEarned: referralStats.totalPoints,
        totalReferrals: referralStats.count,
        weeklyReferrals: 0,
        monthlyReferrals: 0,
      });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ error: "Failed to fetch referral stats" });
    }
  });
  // Get referral leaderboard
  app.get("/api/referrals/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const leaderboard = await storage.getReferralLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching referral leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch referral leaderboard" });
    }
  });
  // Social media analysis endpoint
  app.post("/api/social/analyze-mention", async (req, res) => {
    try {
      const { mentionText, username, walletAddress } = req.body;

      if (!mentionText || !username || !walletAddress) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!socialMediaAnalyzer.isConfigured()) {
        return res
          .status(503)
          .json({ error: "Social media analysis service not configured" });
      }

      const analysis = await socialMediaAnalyzer.analyzeMentionAuthenticity(
        mentionText,
        username
      );

      // Award points based on authenticity and quality
      const basePoints = 10; // Base points for social media mention
      const qualityMultiplier = analysis.qualityScore / 10;
      const authenticityMultiplier = analysis.authenticityScore / 100;

      const pointsEarned = Math.round(
        basePoints * qualityMultiplier * authenticityMultiplier
      );

      // Only award points if not spam and meets minimum thresholds
      let awarded = false;
      if (
        !analysis.isSpam &&
        analysis.authenticityScore >= 60 &&
        analysis.qualityScore >= 5
      ) {
        const user = await storage.getUserByWalletAddress(walletAddress);
        if (user) {
          // Check if user has social media accounts configured
          const hasTwitter =
            user.twitterHandle && user.twitterHandle.trim().length > 0;
          const hasDiscord =
            user.discordHandle && user.discordHandle.trim().length > 0;

          if (!hasTwitter && !hasDiscord) {
            res.json({
              analysis,
              pointsEarned: 0,
              awarded: false,
              error:
                "Please add your X (Twitter) or Discord username to your profile to earn social media points.",
            });
            return;
          }

          try {
            await storage.createActivity({
              userId: user.id,
              activityType: "social_mention",
              points: pointsEarned,
              metadata: JSON.stringify({
                platform: "twitter",
                username,
                authenticityScore: analysis.authenticityScore,
                qualityScore: analysis.qualityScore,
                reasoning: analysis.reasoning,
                verifiedAccount: hasTwitter
                  ? user.twitterHandle
                  : user.discordHandle,
              }),
            });
            awarded = true;
            broadcastUpdate({
              type: "SOCIAL_ACTIVITY",
              user,
              points: pointsEarned,
            });
          } catch (error) {
            console.error("Failed to create social activity:", error);
          }
        }
      }

      res.json({
        analysis,
        pointsEarned: awarded ? pointsEarned : 0,
        awarded,
      });
    } catch (error) {
      console.error("Error analyzing social mention:", error);
      res.status(500).json({ error: "Failed to analyze social mention" });
    }
  });
  // Get user recent referrals
  app.get("/api/referrals/recent/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWalletAddress(walletAddress);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const recentReferrals = await storage.getUserReferrals(user.id);
      res.json(recentReferrals);
    } catch (error) {
      console.error("Error fetching recent referrals:", error);
      res.status(500).json({ error: "Failed to fetch recent referrals" });
    }
  });

  app.get("/api/accolade_collector/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const accoladeExists = await storage.checkAccolade(user.id, "accolade_collector");
      if (!accoladeExists) {
        const hasTwentyAccolades = await storage.hasTwentyAccolades(user.id);
        if (hasTwentyAccolades) {
          const accolade = await insertAccolade(user, "accolade_collector");
          res.json(accolade)
        } else {
          res.json({ "accolade_collector": false })
        }
      } else {
        res.json({ "accolade_collector": true })
      }
    } catch (error) {
      console.error("Error fetching recent referrals:", error);
      res.status(500).json({ error: "Failed to fetch recent referrals" });
    }
  })
  // Profile management endpoints
  app.get("/api/profile/:walletAddress", async (req, res) => {
    try {
      const user = await storage.getUserByWalletAddress(
        req.params.walletAddress
      );
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  app.put("/api/profile/:walletAddress", async (req, res) => {
    try {
      const updatedUser = await storage.updateUserProfile(
        req.params.walletAddress,
        req.body
      );
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });

  app.get("/api/profile/wallets/:walletAddress", async (req, res) => {
    try {
      const user = await storage.getUserByWalletAddress(
        req.params.walletAddress
      );
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const userWallets = await storage.getUserWallets(user.id);
      res.json(userWallets);
    } catch (error) {
      console.error("Error fetching user wallets:", error);
      res.status(500).json({ error: "Failed to fetch user wallets" });
    }
  });

  app.post("/api/profile/wallets/:walletAddress", async (req, res) => {
    try {
      const user = await storage.getUserByWalletAddress(
        req.params.walletAddress
      );
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const walletData = {
        userId: user.id,
        walletAddress: req.body.address,
        label: req.body.label,
        isPrimary: false,
        isActive: true,
      };

      const newWallet = await storage.addUserWallet(walletData);
      res.json(newWallet);
    } catch (error) {
      console.error("Error adding user wallet:", error);
      res.status(500).json({ error: "Failed to add user wallet" });
    }
  });

  app.delete("/api/profile/wallets/:walletId", async (req, res) => {
    try {
      await storage.removeUserWallet(parseInt(req.params.walletId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing user wallet:", error);
      res.status(500).json({ error: "Failed to remove user wallet" });
    }
  });
  // Admin endpoint to view all accolades
  app.get("/api/admin/accolades/all", async (req, res) => {
    try {
      const accolades = await storage.getAllAccolades();
      res.json(accolades);
    } catch (error) {
      console.error("Error fetching all accolades:", error);
      res.status(500).json({ message: "Failed to fetch accolades" });
    }
  });
  // Admin endpoint to fix accolades manually
  app.post("/api/admin/accolades/fix", async (req, res) => {
    try {
      // Manually clean up and fix accolades
      const { db } = await import("./db");
      const { accolades, users, activities } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      // Delete all existing accolades
      await db.delete(accolades);

      // Get all users
      const allUsers = await db.select().from(users).orderBy(users.createdAt);

      // For each user, assign correct accolades based on their join order and activities
      for (let i = 0; i < allUsers.length; i++) {
        const user = allUsers[i];
        const joinOrder = i + 1;

        // Pioneer accolades based on join order (only one)
        if (joinOrder <= 10) {
          await storage.createAccolade({
            userId: user.id,
            accoladeType: "genesis_member",
            // name: 'Genesis Member'
          });
        } else if (joinOrder <= 50) {
          await storage.createAccolade({
            userId: user.id,
            accoladeType: "gemlaunch_pioneer",
            // name: 'Gemlaunch Pioneer'
          });
        } else if (joinOrder <= 1000) {
          await storage.createAccolade({
            userId: user.id,
            accoladeType: "early_adopter",
            // name: 'Early Adopter'
          });
        }

        // Get user activities to determine other accolades
        const userActivities = await db
          .select()
          .from(activities)
          .where(eq(activities.userId, user.id));

        const tokenCreations = userActivities.filter(
          (a) => a.activityType === "token_creation"
        ).length;
        const fairLaunches = userActivities.filter(
          (a) => a.activityType === "fair_launch"
        ).length;
        const presaleLaunches = userActivities.filter(
          (a) => a.activityType === "presale_launch"
        ).length;
        const totalVolume = userActivities.reduce((sum, a) => {
          if (a.activityType === "volume_contribution") {
            const metadata = JSON.parse(a.metadata || "{}");
            return sum + (parseFloat(metadata.amount) || 0);
          }
          return sum;
        }, 0);

        // Award activity-based accolades
        if (tokenCreations >= 1) {
          await storage.createAccolade({
            userId: user.id,
            accoladeType: "token_creator",
            // name: 'Token Creator'
          });
        }

        if (tokenCreations >= 5) {
          await storage.createAccolade({
            userId: user.id,
            accoladeType: "prolific_creator",
            // name: 'Prolific Creator'
          });
        }

        if (fairLaunches >= 1) {
          await storage.createAccolade({
            userId: user.id,
            accoladeType: "fair_launcher",
            // name: 'Fair Launcher'
          });
        }

        if (presaleLaunches >= 1) {
          await storage.createAccolade({
            userId: user.id,
            accoladeType: "presale_master",
            // name: 'Presale Master'
          });
        }

        if (totalVolume >= 100) {
          await storage.createAccolade({
            userId: user.id,
            accoladeType: "funding_veteran",
            // name: 'Funding Veteran'
          });
        }

        if (totalVolume >= 1000) {
          await storage.createAccolade({
            userId: user.id,
            accoladeType: "whale_funder",
            // name: 'Whale Funder'
          });
        }
      }

      // Recalculate points for all users
      for (const user of allUsers) {
        const userAccolades = await storage.getUserAccolades(user.id);
        const { ACCOLADES } = await import("@shared/accolades");
        const accoladeBonus = userAccolades.reduce((total, accolade) => {
          const def = ACCOLADES.find((a) => a.id === accolade.accoladeType);
          return total + (def?.pointsBonus || 0);
        }, 0);

        const userActivities = await storage.getUserActivities(user.id);
        const basePoints = userActivities.reduce(
          (total, activity) => total + activity.points,
          0
        );
        const totalPoints = basePoints + accoladeBonus;

        await db
          .update(users)
          .set({ totalPoints })
          .where(eq(users.id, user.id));
      }

      broadcastUpdate({
        type: "accolades_fixed",
        message: "All accolades have been cleaned up and recalculated",
      });

      res.json({ success: true, message: "Accolades fixed successfully" });
    } catch (error) {
      console.error("Error fixing accolades:", error);
      res.status(500).json({ message: "Failed to fix accolades" });
    }
  });
  // Endpoint to insert accolade for user (admin or self-service)
  app.post("/api/users/:address/accolades", async (req, res) => {
    try {
      const { db } = await import("./db");
      // const user_address = parseInt(req.params.address);
      const userId = await storage.getUserByWalletAddress(req.params.address);
      const { symbol } = req.body; // symbol from gem_accolades
      if (!userId) {
        return res.status(404).json({ error: "User not found" });
      }
      // Find accolade definition
      const [accoladeDef] = await db
        .select()
        .from(gemAccolades)
        .where(eq(gemAccolades.symbol, symbol));

      if (!accoladeDef) {
        return res.status(404).json({ error: "Accolade not found" });
      }

      // Insert into accolades table for user
      const accolade = await insertAccolade(userId, symbol);

      res.json(accolade);
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error ? error.message : "Failed to insert accolade",
      });
    }
  });
  // Social campaigns endpoint (Sweep Widget integration area)
  app.get("/api/social/campaigns", async (req, res) => {
    try {
      res.json({
        status: "coming_soon",
        message: "Social campaigns will be available mid-season",
        integrationReady: true,
        estimatedLaunch: "Mid Season 1",
        features: {
          xCampaigns: { enabled: false, maxPoints: 500 },
          discordTasks: { enabled: false, maxPoints: 300 },
          communityGoals: { enabled: false, multipliers: true },
        },
      });
    } catch (error) {
      console.error("Error fetching social campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });
  // Connect wallet - create or get user
  app.post("/api/wallet/connect", async (req, res) => {
    try {
      const { walletAddress, referral } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      // Check if user already exists
      let user = await storage.getUserByWalletAddress(walletAddress);
      const Refferr = referral
        ? await storage.getUserByReferralCode(referral)
        : null;

      if (!user) {
        // Create new user with referral code
        const referralCode = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();
        user = await storage.createUser({
          walletAddress,
          totalPoints: 0,
          referralCode,
          referredBy: Refferr ? Refferr.id : null,
        });

        if (user && Refferr && Refferr.id !== user.id) {
          console.log("Refferr", Refferr);
          storage
            .createReferral({
              referrerId: Refferr ? Refferr.id : 0,
              refereeId: user.id,
              pointsEarned: 0,
              isQualified: false,
              qualificationAmount: 0.0,
            })
            .catch((err) => {
              console.error("Failed to create referral record:", err);
            });
          // creating the Influencer Accolade.
          // insertAccolade( Refferr , 'Influencer' );
          // 🔥 Push to BullMQ queue
          await accoladeQueue.add("createInfluencerAccolade", {
            Refferr,
            accolade: "Influencer",
          });
        }

        // Give welcome bonus points
        await storage.createActivity({
          userId: user.id,
          activityType: "welcome_bonus",
          points: 100,
          metadata: JSON.stringify({ reason: "Welcome to GemLaunch!" }),
        });

        // Add sample activities for demo
        await storage.createActivity({
          userId: user.id,
          activityType: "token_creation",
          points: 500,
          metadata: JSON.stringify({ tokenName: "DEMO", tokenSymbol: "DMO" }),
        });

        await storage.createActivity({
          userId: user.id,
          activityType: "project_funding",
          points: 300,
          metadata: JSON.stringify({
            amount: "0.5 BNB",
            project: "DeFi Protocol",
          }),
        });

        await storage.createActivity({
          userId: user.id,
          activityType: "referral_bonus",
          points: 200,
          metadata: JSON.stringify({ referredUser: "0x1234...5678" }),
        });

        // Create Gemlaunch Pioneer accolade for early users
        await storage.createAccolade({
          userId: user.id,
          accoladeType: "gemlaunch_pioneer",
          level: 1,
          multiplier: 1.1,
        });

        await storage.updateUserPoints(user.id, 1100); // 100 + 500 + 300 + 200
      }

      await accoladeQueue.add("createInfluencerAccolade", {
        user,
        accolade: "genesis_member",
      });

      res.json({
        user,
        message:
          user.totalPoints === 0
            ? "Welcome to GemLaunch! You've earned 100 welcome points!"
            : "Welcome back!",
      });
    } catch (error) {
      console.error("Error connecting wallet:", error);
      res.status(500).json({ error: "Failed to connect wallet" });
    }
  });
  // Blockchain scanning endpoint for discovering real Gemlaunch users
  app.post("/api/admin/scan-blockchain", async (req, res) => {
    try {
      const { gemlaunchScanner } = await import("./scanner");

      console.log("🔍 Starting blockchain scan for Gemlaunch users...");

      // Scan recent blocks (last 30 days approximately)
      const currentBlock = await gemlaunchScanner["web3"].eth.getBlockNumber();
      const blocksPerDay = 28800; // Approximately 3 seconds per block on BSC
      const fromBlock = Math.max(0, Number(currentBlock) - blocksPerDay * 30);

      const users = await gemlaunchScanner.scanHistoricalUsers(fromBlock);

      if (users.length > 0) {
        await gemlaunchScanner.importUsersToDatabase(users);

        // Broadcast update to connected clients
        broadcastUpdate({
          type: "blockchain_scan_complete",
          data: {
            usersFound: users.length,
            message: `Found ${users.length} new users from blockchain scan`,
          },
        });
      }

      res.json({
        success: true,
        usersFound: users.length,
        scannedBlocks: blocksPerDay * 30,
        fromBlock,
        toBlock: currentBlock,
        users: users.slice(0, 10), // Return first 10 users for preview
      });
    } catch (error) {
      console.error("Error scanning blockchain:", error);
      res.status(500).json({
        success: false,
        message: "Failed to scan blockchain",
        error: error?.message,
      });
    }
  });
  // Funding Veteran
  app.post("/api/get/user-investments", async (req, res) => {
    const GRAPHQL_URL = "https://api.studio.thegraph.com/query/120543/launchpad-gempad-bsc/0.0.4";

    const SECOND_GRAPHQL_URL = "https://api.studio.thegraph.com/query/120239/indexing-gempad-usdc/0.0.4"
    const { walletAddress } = req.body;
    console.log({ walletAddress })

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    try {
      // Step 1: Get user purchases from the first subgraph
      const purchasesQuery = `
    query {
      purchases(where: {buyer: "${walletAddress.toLowerCase()}"}) {
        timestamp
        id
        buyer
        amount
        launchpad {
          token
        }
      }
    }
  `;


      const purchasesResponse = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
        query {
          purchases(where: {buyer: "${walletAddress.toLowerCase()}"}) {
            id
            timestamp
            buyer
            amount
            launchpad {
              token
            }
          }
        }
      `,
          variables: {}
        }),
      });
      console.log({ purchasesResponse })

      const purchasesData = await purchasesResponse.json();
      console.log("Purchases query body:", JSON.stringify({
        query: purchasesQuery,
        variables: { walletAddress: walletAddress.toLowerCase() },
      }, null, 2));

      console.log("Purchases response:", JSON.stringify(purchasesData, null, 2));

      if (!purchasesData.data || !purchasesData.data.purchases) {
        return res.status(200).json({
          message: "No investments found for this wallet address.",
          totalInvestment: "0",
          investments: []
        });
      }

      const purchases = purchasesData.data.purchases;

      if (purchases.length === 0) {
        return res.status(200).json({
          message: "No investments found for this wallet address.",
          totalInvestment: "0",
          investments: []
        });
      }

      // Step 2: Get unique token addresses
      const uniqueTokens = [...new Set(purchases.map(purchase => purchase.launchpad.token))];

      // Step 3: Fetch token details from the second subgraph
      const tokenDetailsMap = {};

      for (const tokenAddress of uniqueTokens) {
        const tokenQuery = `
            query MyQuery {
              token(id: "${tokenAddress.toLowerCase()}") {
                owner
                decimals
              }
            }
          `;

        const tokenResponse = await fetch(SECOND_GRAPHQL_URL, { // Assuming you have a second subgraph URL
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: tokenQuery,
          }),
        });

        const tokenData = await tokenResponse.json();
        console.log({ tokenData: tokenData.data })

        if (tokenData.data && tokenData.data.token) {
          tokenDetailsMap[tokenAddress] = tokenData.data.token;
        } else {
          // Default to 18 decimals if token not found
          tokenDetailsMap[tokenAddress] = { decimals: "18", owner: null };
        }
      }

      // Step 4: Calculate normalized amounts and prepare response
      let totalInvestment = 0;
      const investments = purchases.map(purchase => {
        const tokenAddress = purchase.launchpad.token;
        const tokenDetails = tokenDetailsMap[tokenAddress];
        const decimals = parseInt(tokenDetails.decimals);

        // Convert amount from wei to human readable format
        const normalizedAmount = parseFloat(purchase.amount) / Math.pow(10, decimals);
        totalInvestment += normalizedAmount;

        return {
          id: purchase.id,
          timestamp: purchase.timestamp,
          buyer: purchase.buyer,
          tokenAddress: tokenAddress,
          rawAmount: purchase.amount,
          normalizedAmount: normalizedAmount.toString(),
          decimals: decimals,
          tokenOwner: tokenDetails.owner
        };
      });

      // Create user if doesn't exist (following the pattern from other endpoints)
      let user = await storage.getUserByWalletAddress(walletAddress);

      if (!user) {
        const referralCode = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();
        user = await storage.createUser({
          walletAddress: walletAddress,
          totalPoints: 0,
          referralCode,
          referredBy: null,
        });
      }

      // Award accolades based on investment activity
      if (investments.length >= 1) {
        await insertAccolade(user, "first_investor");
      }
      if (investments.length >= 10) {
        await insertAccolade(user, "active_investor", 10);
      }
      if (totalInvestment >= 1000) { // Assuming 1000 is a significant investment threshold
        await insertAccolade(user, "whale_investor");
      }

      const totalBNB = totalInvestment; // you already summed this up from purchases
      const totalUSDC = await convertBNBtoUSDC(totalBNB);
      console.log(`Total Investment: ${totalBNB} BNB ≈ ${totalUSDC.toFixed(2)} USDC`);

      return res.json({
        walletAddress: walletAddress,
        totalInvestments: investments.length,
        totalInvestment: totalInvestment.toString(),
        investments: investments
      });

    } catch (error) {
      console.error("Error fetching user investments:", error);
      return res.status(500).json({ error: "Failed to fetch user investments" });
    }
  });
  // FUNDING VETERAN - LAUNCH PAD
  app.post("/api/post/funding_veteran", async (req, res) => {
    try{
      const {owner} = req.body;
        // fetching launchpads
      const launchPadsQuery = `
        query($owner: Bytes!) {
        launchpads(where: {owner: $owner}) {
          token
          softCap
          owner
          totalRaised
          }
        }
      `;
      const data:any = await runGraphQLQuery(LAUNCHPAD_SUBGRAPH, launchPadsQuery, {owner: owner.toLowerCase()});
      const totalBNB = getTotalRaisedInBNB(data.data.launchpads);
      const totalUSDC = await convertBNBtoUSDC(totalBNB);
      const THRESHOLD = 5000;
      if(totalUSDC >= THRESHOLD){
        let user = await storage.getUserByWalletAddress(owner);
        await insertAccolade(user as User, "funding_veteran")
        res.status(200).json({status: 200, message: "If exists",data: {"funding_veteran": true, total_launchpads: data.data.launchpads.length || 0, total_volume_usdc: totalUSDC, total_volume_bnb: totalBNB  } })
      }else{
        res.status(200).json({status: 200, message: "If exists",data: {"funding_veteran": false, total_launchpads: data.data.launchpads.length || 0, total_volume_usdc: totalUSDC, total_volume_bnb: totalBNB} })
      }
    }catch(err){
      console.log({err});
      res.status(400).json({status: 400, message: "Something went wrong", data: null})
    }
  })
  // LAUNCH MASTER
  app.post("/api/post/launch_master", async (req, res) => {
    const {owner} = req.body;
    console.log({owner})
    // fetching launchpads
    const launchPadsQuery = `
      query($owner: Bytes!) {
      launchpads(where: {owner: $owner}) {
        token
        softCap
        owner
        totalRaised
      }
    }
    `;
    const data:any = await runGraphQLQuery(LAUNCHPAD_SUBGRAPH, launchPadsQuery, {owner: owner.toLowerCase()});
    if(data?.data?.launchpads.lengh === 0){
      res.status(200).json({status: 200, message: "If exists",data: {"launch_master": false, total_launchpads: data.data.launchpads.length || 0, successfulLaunchPads : 0 } })
    }
    const successfulLaunchPads = countSuccessfulLaunchpads(data.data.launchpads);
    const user = await storage.getUserByWalletAddress(owner);
    if(successfulLaunchPads > 1){
      await insertAccolade(user as User, "launch_master");
    }
    res.status(200).json({status: 200, message: "If exists",data: {"launch_master": successfulLaunchPads > 1, total_launchpads: data.data.launchpads.length || 0, successfulLaunchPads } })
    
    // const totalBNB = getTotalRaisedInBNB(data.data.launchpads);
    // const totalUSDC = await convertBNBtoUSDC(totalBNB);
    // const THRESHOLD = 5000;
    // if(totalUSDC >= THRESHOLD){
    //   let user = await storage.getUserByWalletAddress(owner);
    //   console.log({user});
    // console.log(await insertAccolade(user, "funding_veteran"))
    //   res.status(200).json({status: 200, message: "If exists",data: {"funding_veteran": true, total_launchpads: data.data.launchpads.length || 0, total_volume_usdc: totalUSDC, total_volume_bnb: totalBNB  } })
  // }
  })
  // FIRST FUNDER 
  const firstFunderReward = async ({wallet, graph, user, launchpadGraph, isGiven = false}:{wallet: string, graph: string, user : User | undefined, launchpadGraph: string, isGiven: Boolean}) => {
    if(!isGiven){
      let given = false;
      let query = `
        query MyQuery($buyer: String!, $minAmount: String!) {
          purchaseEntities(where: {buyer: $buyer, amount_gt: $minAmount}) {
            token
            id
            amount
          }
        }
      `;
      const fairlaunchPurchases:any = await runGraphQLQuery(graph, query, {buyer: wallet, minAmount: "0"});
      if(!fairlaunchPurchases.errors && fairlaunchPurchases.data && fairlaunchPurchases.data.purchaseEntities.length > 0){
        console.log(await insertAccolade(user as User, "first_funding"));
        await createAccoladeLog({accoladeName: "First Funder", accoladeType: "first_funding", userId: user.id, description: "You bought fairlaunch token!", points: 200});
        given = true
      }
      if(!given){
        let launchPadsQuery = `
          query MyQuery($buyer: String!, $minAmount: String!) {
            purchases(where: {buyer: $buyer, amount_gt: $minAmount}) {
              id
              amount
            }
          }
        `;
        const launchpadPurchases:any = await runGraphQLQuery(launchpadGraph, launchPadsQuery, {buyer: wallet, minAmount: "0"});
        console.log({launchpadPurchases: launchpadPurchases.data.purchases})
        if(!launchpadPurchases?.errors && launchpadPurchases?.data && launchpadPurchases?.data?.purchases){
          console.log(await insertAccolade(user as User, "first_funding"));
          await createAccoladeLog({accoladeName: "First Funder", accoladeType: "first_funding", userId: user.id, description: "You bought launchpad token!", points: 200});
          given = true
        }
      }
    }    
  }
  const failaunchMaster = async({wallet, graph, user, launchpadGraph, isGiven = false}:{wallet: string, graph: string, user: User | undefined, launchpadGraph: string, isGiven: Boolean}) => {
    if(!isGiven){
      const query = `
      query MyQuery($owner: String!) {
        fairLaunchEntities(where: { owner: $owner }) {
          owner
          softCap
          token
          purchases {
            amount
          }
        }
      }
    `;
      const fairlaunchs:any = await runGraphQLQuery(graph, query, {owner: wallet});
      console.log({fairlaunchs});
      if(fairlaunchs && fairlaunchs?.data && fairlaunchs?.data?.fairLaunchEntities){
          const isSuccessfull = isAnyFairLaunchSuccessful(fairlaunchs?.data?.fairLaunchEntities);
          if(isSuccessfull){
            await insertAccolade(user as User, "launch_master");
            await createAccoladeLog({accoladeName: "Launch Master", accoladeType: "launch_master", userId: user.id, description: "Successfully completed a fairlaunch project", points: 200})
          }
      }
    }
  }
  const tokenCreatorAndSerialCreator = async ({wallet, graph, user, isGiven = false}: {wallet: string, graph: string, user: User | undefined, launchpadGraph: string, isGiven: Boolean}) => {
    if(!isGiven){
      const query = `
      query MyQuery($owner: String!) {
        tokens(where: {owner: $owner}) {
          name
          tokenType
          symbol
          owner
          id
        }
      }
    `;
    const tokens:any = await runGraphQLQuery(graph, query, {owner: wallet});
    console.log({tokens })
    if (tokens && !tokens?.errors && tokens?.data?.tokens?.length !== 0) {
      await insertAccolade(user as User, "token_creator");
      await createAccoladeLog({accoladeName: "Token Creator", accoladeType: "token_creator", userId: user?.id as number, description: "Successfully created your first token", points: 200 });
      if (tokens.data.tokens.length >= 5) {
        await insertAccolade(user as User, "serial_creator", 5);
        // create accolade log to continue
        await createAccoladeLog({accoladeName: "Serial Creator", accoladeType: "serial_creator", userId: user?.id as number, description: "Successfully launched 5+ tokens!", points: 200 });     
      }
    }
    }
  };

  // TOKENS
  app.post("/api/get/tokens", async (req, res) => {
    const { owner } = req.body;
    if (!owner) {
      sendResponse(res, 400,"Owner address is required", null); 
    }
    const query = `
      query MyQuery($owner: String!) {
        tokens(where: {owner: "${owner}"}) {
          name
          tokenType
          symbol
          owner
          id
        }
      }
    `;
    try {
      const response = await fetch(GRAPHQL_URL_TOKEN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { owner },
        }),
      });
      const data = await response.json();
      if (data.data.tokens.length === 0) {
        sendResponse(res, 200,"No token(s) found", {tokens: 0}); 
      }
      let user:any = await storage.getUserByWalletAddress(owner);
      let reward = {token_creator: false, serial_creator: false};
      if (data.data.tokens.length >= 1) {
        await insertAccolade(user as User, "token_creator");
        await createAccoladeLog({accoladeName: "Token Creator", accoladeType: "token_creator", userId: user?.id as number, description: "Successfully created your first token", points: 200 })
        reward.token_creator = true;
      }
      if (data.data.tokens.length >= 5) {
        await insertAccolade(user as User, "serial_creator", 5);
        // create accolade log to continue
        await createAccoladeLog({accoladeName: "Serial Creator", accoladeType: "serial_creator", userId: user?.id as number, description: "Successfully launched 5+ tokens!", points: 200 })
        reward.serial_creator = true;
      }

      // check first funder - deposit in any token

      sendResponse(res, 200,"Token fetched successfully", { tokens: data.data.tokens.length, serial_creator: reward.serial_creator, token_creator: reward.token_creator }); 
    } catch (error) {
      console.error(error);
      sendResponse(res, 500,"Something went wrong", null); 
    }
  });
  
  
  
  //AVAILBLE ACCOLADES
  app.get("/api/available/accolades/:wallet_address", async (req, res) => {
    try {
      const { wallet_address } = req.params;
      const user: User | undefined = await storage.getUserByWalletAddress(wallet_address);
      if (!user) {
        return sendResponse(res, 500, "Invalid wallet address found", null);
      }
      await tokenCreatorAndSerialCreator({wallet : wallet_address, graph: FAIRLAUCH_SUBGRAPH, user: user, launchpadGraph: LAUNCHPAD_SUBGRAPH, isGiven: false}); 
      await firstFunderReward({wallet : wallet_address, graph: FAIRLAUCH_SUBGRAPH, user: user, launchpadGraph: LAUNCHPAD_SUBGRAPH, isGiven: false});     
      await failaunchMaster({wallet : wallet_address, graph: FAIRLAUCH_SUBGRAPH, user, launchpadGraph: LAUNCHPAD_SUBGRAPH, isGiven: false});     
      const accolades = await getAllAccoladesForUser(user.id);
      console.log(accolades.rows);
      sendResponse(res, 200, "All accolades fetched successfully", accolades?.rows || []);
    } catch (err) {
      sendResponse(res, 500, "Something went wrong", null);
    }
  });
  // CREATE LOGS
  


 



  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);

    ws.on("close", () => {
      clients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(ws);
    });
  });

  // Broadcast function for real-time updates
  function broadcastUpdate(update: any) {
    const message = JSON.stringify(update);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Start blockchain monitoring
  blockchainService.startMonitoring((update) => {
    broadcastUpdate({ type: "blockchain", data: update });
  });

  // Database health check endpoint
  app.get("/api/health/database", async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard(3);

      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          userCount: leaderboard.length,
          connection: "PostgreSQL",
          message: "Database connection successful",
        },
      });
    } catch (error) {
      console.error("Database health check failed:", error);
      res.status(500).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  });

  // Store broadcast function globally for use in other modules
  (global as any).broadcastUpdate = broadcastUpdate;

  return httpServer;
}



