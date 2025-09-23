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
  users,
} from "@shared/schema";
import { z } from "zod";
import { socialMediaAnalyzer } from "./services/ai";
import { asc, eq } from "drizzle-orm";
import { insertAccolade, insertAccoladeInAccolade } from "./services/insertAccolade";
import { accoladeQueue } from "./queues/accoladeQueue";
import { convertBNBtoUSDC, countSuccessfulLaunchpads, createAccoladeLog, createUserActivity, getAccoladeTypesByUser, getActivityByType, getAllAccoladesForUser, getAllPointEarningActivities, getGivenAccoladesForUser, getTotalRaisedInBNB, getUserAccoladesHistory, getUserActivities, isAnyFairLaunchSuccessful, markUserAccolades, runGraphQLQuery, sendResponse } from "./helpers";
import { useTransition } from "react";
import { db } from "./db";
import { ActivityKey, PointsEarningActivityTypes } from "./constants";
// import { redis } from "./redis/conectionCheck";

//waseem
  const LAUNCHPAD_SUBGRAPH = "https://api.studio.thegraph.com/query/120543/launchpad-gempad-bsc/0.0.4"
  const FAIRLAUCH_SUBGRAPH = "https://api.studio.thegraph.com/query/120543/fairlaunch-gempad-bsc/0.0.6";
  const TOKEN_SUBGRAPH = "https://api.studio.thegraph.com/query/120239/indexing-gempad-usdc/0.0.4"
  const GRAPHQL_URL_TOKEN = "https://api.studio.thegraph.com/query/120239/indexing-gempad-usdc/0.0.4";
  const NEW_GEMLAUNCH_SUBGRAPH = "https://api.studio.thegraph.com/query/111026/test/version/latest"


const GRAPHQL_URL = "https://api.studio.thegraph.com/query/120239/gempad/0.0.3";
const GRAPHQL_URL_LaunchPads =
  "https://api.studio.thegraph.com/query/120239/launchpad-subgraph/0.0.2";
const TOKENS_SUBGRPH = "https://api.studio.thegraph.com/query/120239/launchpad-subgraph/0.0.2"
export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/get/tokens", async (req, res) => { 
    const { owner } = req.body;

    if (!owner) {
      return res.status(400).json({ error: "Owner address is required" });
    }

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

    try {
      const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { owner },
        }),
      });

      const data = await response.json();
      // console.log('data', data)
      if (data.data.tokens.length === 0) {
        res.status(200).json({ message: "No tokens found for this owner." });
      }

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

      if (data.data.tokens.length >= 1) {
        await insertAccolade(user, "token_creator");
      }
      if (data.data.tokens.length >= 5) {
        await insertAccolade(user, "serial_creator", 5);
      }

      return res.json(data.data.tokens);
    } catch (error) {
      console.error("GraphQL fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch tokens" });
    }
  });


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
      // const activityData = insertActivitySchema.parse(req.body);
      // const activity = await storage.createActivity(activityData);
      const { userAddress , points } = req.body;

      console.log('first', { userAddress , points })
      const user = await storage.getUserByWalletAddress(userAddress);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
         }
      // Broadcast activity update via WebSocket
      // broadcastUpdate({ type: "activity", data: activity }); 
      await storage.updateUserPoints(user.id , points);
      await createAccoladeLog({accoladeName: "Gem Launch", accoladeType: "gem_launch_points", userId: user.id, description: `Gem launch has gifted you ${points} points`, points: Number(points)})
      res.status(200).json({ success: true , message : 'Points updated successfully' });
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
  app.get("/api/user/accolades/:wallet", async (req, res) => {
    try {
      const walletAddress = req.params.wallet as string;
      console.log("waletttttttttttttttttttttttttttttttttttttttttttttt", walletAddress)
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
      const configs = await storage.getGemAccolades();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch point configs" });
    }
  });

  app.put("/api/point-configs/:activityType", async (req, res) => {
    try {
      const { activityType } = req.params;
      const { pointsBonus } = req.body;

      if (!pointsBonus || pointsBonus < 0) {
        return res.status(400).json({ error: "Invalid base points value" });
      }

      await storage.updateGemAccolades(activityType, pointsBonus);
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
        // if (joinOrder <= 10) {
        //   await storage.createAccolade({
        //     userId: user.id,
        //     accoladeType: "genesis_member",
        //     // name: 'Genesis Member'
        //   });
        // } else if (joinOrder <= 50) {
        //   await storage.createAccolade({
        //     userId: user.id,
        //     accoladeType: "gemlaunch_pioneer",
        //     // name: 'Gemlaunch Pioneer'
        //   });
        // } else if (joinOrder <= 1000) {
        //   await storage.createAccolade({
        //     userId: user.id,
        //     accoladeType: "early_adopter",
        //     // name: 'Early Adopter'
        //   });
        // }

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
          const def = ACCOLADES.find((a) => a.id?.toString() === accolade.accoladeType);
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
          insertAccolade( Refferr , 'influencer' );
          // 🔥 Push to BullMQ queue
          // await accoladeQueue.add("createInfluencerAccolade", {
          //   Refferr,
          //   accolade: "Influencer",
          // });
        }

        // Give welcome bonus points
        // await storage.createActivity({
        //   userId: user.id,
        //   activityType: "welcome_bonus",
        //   points: 100,
        //   metadata: JSON.stringify({ reason: "Welcome to GemLaunch!" }),
        // });

        // // Add sample activities for demo
        // await storage.createActivity({
        //   userId: user.id,
        //   activityType: "token_creation",
        //   points: 500,
        //   metadata: JSON.stringify({ tokenName: "DEMO", tokenSymbol: "DMO" }),
        // });

        // await storage.createActivity({
        //   userId: user.id,
        //   activityType: "project_funding",
        //   points: 300,
        //   metadata: JSON.stringify({
        //     amount: "0.5 BNB",
        //     project: "DeFi Protocol",
        //   }),
        // });

        // await storage.createActivity({
        //   userId: user.id,
        //   activityType: "referral_bonus",
        //   points: 200,
        //   metadata: JSON.stringify({ referredUser: "0x1234...5678" }),
        // });

        // Create Gemlaunch Pioneer accolade for early users

        // await storage.updateUserPoints(user.id, 1100); // 100 + 500 + 300 + 200
      }

      // await accoladeQueue.add("createInfluencerAccolade", {
      //   user,
      //   accolade: "genesis_member",
      // });

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
    } catch (error:any) {
      console.error("Error scanning blockchain:", error);
      res.status(500).json({
        success: false,
        message: "Failed to scan blockchain",
        error: error?.message,
      });
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
  const getAccoladePoints = async (accoladeType: string): Promise<number> => {
    const result = await db
      .select({ points: gemAccolades.pointsBonus })
      .from(gemAccolades)
      .where(eq(gemAccolades.symbol, accoladeType))
      .limit(1);
  
    if (result.length > 0 && result[0].points !== null) {
      return result[0].points;
    }
    return 0; // fallback
  };  
  // FIRST FUNDER 
  const firstFunderReward = async ({
    wallet,
    graph,
    user,
    isGiven = false
  }: {
    wallet: string;
    graph: string;
    user: User | undefined;
    isGiven: boolean;
  }) => {
    console.log(">>>>>>>>>>>>>>>>>>> firstFunderReward <<<<<<<<<<<<<<<<<<")
    if (isGiven) {
      console.log(`[FirstFunderReward] Skipping check because accolade already given for wallet: ${wallet}`);
      return false;
    }
  
    console.log(`[FirstFunderReward] Checking purchases for wallet: ${wallet}`);
  
    let given = false;
  
    const query = `
      query MyQuery($buyer: String!) {
        dutchPurchases(where: {buyer: $buyer}) {
          fundAmountBNB
        }
        fairPurchases(where: {buyer: $buyer}) {
          fundAmountBNB
        }
        privatePurchases(where: {buyer: $buyer}) {
          fundAmountBNB
        }
        subscriptionPurchases(where: {buyer: $buyer}) {
          fundAmountBNB
        }
        purchases(where: {buyer: $buyer}) {
          fundAmountBNB
        }
      }
    `;
  
    const res: any = await runGraphQLQuery(graph, query, { buyer: wallet });
  
    if (!res?.errors && res?.data) {
      console.log(`[FirstFunderReward] GraphQL query successful for wallet: ${wallet}`);
  
      // collect all arrays safely
      const allPurchases = [
        ...(res.data?.dutchPurchases ?? []),
        ...(res.data?.fairPurchases ?? []),
        ...(res.data?.privatePurchases ?? []),
        ...(res.data?.subscriptionPurchases ?? []),
        ...(res.data?.purchases ?? [])
      ];
  
      console.log(`[FirstFunderReward] Total purchases fetched: ${allPurchases.length}`);
  
      if (allPurchases.length === 0) {
        console.log(`[FirstFunderReward] No purchases found for wallet: ${wallet}`);
        return false;
      }
  
      // check if any purchase has > 0 amount
      const hasFunded = allPurchases.some((p: any, idx: number) => {
        const amount = parseFloat(p?.fundAmountBNB ?? "0");
        console.log(`   ↳ Purchase[${idx}] fundAmountBNB = ${amount}`);
        return amount > 0;
      });
  
      if (hasFunded) {
        console.log(`[FirstFunderReward] ✅ Wallet ${wallet} has funded! Awarding accolade...`);
        await insertAccoladeInAccolade(user as User, "first_funding");
        const points = await getAccoladePoints("first_funding");
        await createAccoladeLog({
          accoladeName: "First Funder",
          accoladeType: "first_funding",
          userId: user ? user.id : 0,
          description: "You bought tokens in a launchpad!",
          points
        });
        given = true;

        // making a user paid after is first investment.
        if(user) { 
          await storage.updateUser_is_paid(user.id);
          await insertAccolade( user , 'referrer' );
        }
        console.log(`[FirstFunderReward] 🎉 Accolade awarded: First Funder (${points} points)`);
      } else {
        console.log(`[FirstFunderReward] ❌ Wallet ${wallet} has purchases but all are 0 BNB`);
      }
    } else {
      
      console.error(`[FirstFunderReward] GraphQL query failed for wallet: ${wallet}`, res?.errors);
    }
  
    return given;
  };
  const fairlaunchMaster = async ({
    wallet,
    graph,
    user,
    isGiven = false
  }: {
    wallet: string;
    graph: string;
    user: User | undefined;
    isGiven: boolean;
  }) => {
    console.log(">>>>>>>>>>>>>>>>>>> fairlaunchMaster <<<<<<<<<<<<<<<<<<")
    if (isGiven) {
      console.log(`[FairlaunchMaster] Skipping, accolade already given for wallet: ${wallet}`);
      return false;
    }
  
    const query = `
      query MyQuery($owner: String!) {
        fairlaunches(where: { owner: $owner }) {
          fundToken
          softCap
          purchases {
            fundAmountBNB
            fundAmount
            buyer
          }
          totalRaised
          tokenDecimals
          fundTokenDecimals
        }
      }
    `;
  
    const res: any = await runGraphQLQuery(graph, query, { owner: wallet });
    
    if (!res?.errors && res?.data?.fairlaunches && res?.data?.fairlaunches?.length > 0) {
      const tokenCreationActivity = await getActivityByType(PointsEarningActivityTypes?.fair_launch?.type || "fair_launch");
        await createUserActivity({activity_id: tokenCreationActivity.id, points: tokenCreationActivity.points, user_id: user?.id as number});
        await createAccoladeLog({
          accoladeName: "Fairlaunch",
          accoladeType: "fair_launch",
          userId: user?.id as number,
          description: "Successfully unlocked fairlaunch activity",
          points: tokenCreationActivity?.points
        });
        if(user?.id){
          await storage.updateUserPoints(user?.id, tokenCreationActivity?.points);
        }
      console.log(`[FairlaunchMaster] Found ${res.data.fairlaunches.length} fairlaunches for wallet: ${wallet}`);
  
      const isSuccessful = res.data.fairlaunches.some((fl: any, idx: number) => {
        const softCap = parseFloat(fl?.softCap ?? "0");
        const totalRaised = parseFloat(fl?.totalRaised ?? "0");
  
        console.log(
          `   ↳ Fairlaunch[${idx}] token=${fl.fundToken}, softCap=${softCap}, totalRaised=${totalRaised}`
        );
  
        if (fl?.purchases?.length) {
          fl.purchases.forEach((p: any, i: number) => {
            console.log(
              `       Purchase[${i}] buyer=${p.buyer}, fundAmountBNB=${p.fundAmountBNB}, fundAmount=${p.fundAmount}`
            );
          });
        } else {
          console.log(`       No purchases for this fairlaunch`);
        }
  
        return totalRaised >= softCap && softCap > 0;
      });
  
      if (isSuccessful) {
        console.log(`[FairlaunchMaster] ✅ Successful fairlaunch detected → awarding accolade`);
        await insertAccoladeInAccolade(user as User, "launch_master");
        const points = await getAccoladePoints("launch_master");
        await createAccoladeLog({
          accoladeName: "Launch Master",
          accoladeType: "launch_master",
          userId: user ? user.id : 0,
          description: "Successfully completed a fairlaunch project",
          points
        });
        return true;
      } else {
        console.log(`[FairlaunchMaster] ❌ No successful fairlaunch found for wallet: ${wallet}`);
      }
    } else {
      console.error(`[FairlaunchMaster] GraphQL query failed for wallet: ${wallet}`, res?.errors);
    }
  
    return false;
  };
  const tokenCreatorAndSerialCreator = async ({
    wallet,
    graph,
    user,
    isGiven = false
  }: {
    wallet: string;
    graph: string;
    user: User | undefined;
    launchpadGraph: string;
    isGiven: Boolean;
  }) => {
    console.log(">>>>>>>>>>>>>>>>>>> tokenCreatorAndSerialCreator START <<<<<<<<<<<<<<<<<<");
    console.log(`[TokenCreator] wallet=${wallet}, isGiven=${isGiven}`);
  
    if (!isGiven) {
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
  
      console.log("[TokenCreator] Running GraphQL query...");
      const tokens: any = await runGraphQLQuery(graph, query, { owner: wallet });
  
      if (!tokens) {
        console.log("[TokenCreator] ❌ No response from subgraph");
        return;
      }
  
      if (tokens?.errors) {
        console.error("[TokenCreator] ❌ GraphQL errors:", tokens.errors);
        return;
      }
  
      const tokenCount = tokens?.data?.tokens?.length || 0;
      console.log(`[TokenCreator] Found ${tokenCount} tokens for wallet=${wallet}`);
  
      if (tokenCount > 0) {
        console.log("[TokenCreator] ✅ Eligible for Token Creator accolade");
        await insertAccoladeInAccolade(user as User, "token_creator");
        const points = await getAccoladePoints("token_creator");
        console.log(`[TokenCreator] Logging Token Creator accolade with ${points} points`);
        await createAccoladeLog({
          accoladeName: "Token Creator",
          accoladeType: "token_creator",
          userId: user?.id as number,
          description: "Successfully created your first token",
          points
        });
        // points activities
        const tokenCreationActivity = await getActivityByType(PointsEarningActivityTypes?.token_creation?.type || "token_creation");
        await createUserActivity({activity_id: tokenCreationActivity.id, points: tokenCreationActivity.points, user_id: user?.id as number});
        await createAccoladeLog({
          accoladeName: "Token Creation",
          accoladeType: "token_creation",
          userId: user?.id as number,
          description: "Successfully unlocked token creation activity",
          points: tokenCreationActivity?.points
        });
        if(user?.id){
          await storage.updateUserPoints(user?.id, tokenCreationActivity?.points);
        }
  
        if (tokenCount >= 5) {
          console.log("[SerialCreator] ✅ Eligible for Serial Creator accolade");
          await insertAccoladeInAccolade(user as User, "serial_creator", 5);
          const points = await getAccoladePoints("serial_creator");
          console.log(`[SerialCreator] Logging Serial Creator accolade with ${points} points`);
          await createAccoladeLog({
            accoladeName: "Serial Creator",
            accoladeType: "serial_creator",
            userId: user?.id as number,
            description: "Successfully launched 5+ tokens!",
            points
          });
        } else {
          console.log(`[SerialCreator] ❌ Not eligible (only ${tokenCount}/5 tokens)`);
        }
      } else {
        console.log("[TokenCreator] ❌ Not eligible — no tokens found");
      }
    } else {
      console.log("[TokenCreator] Skipping — accolade already given");
    }
  
    console.log(">>>>>>>>>>>>>>>>>>> tokenCreatorAndSerialCreator END <<<<<<<<<<<<<<<<<<");
  };
  const fundingVeteranHandler = async ({
    wallet,
    graph,
    user,
    requireMultipleLaunches = false, 
    isGiven = false,
    thresholdUSDC = 5000 
  }: {
    wallet: string;
    graph: string;
    user: User | undefined;
    requireMultipleLaunches?: boolean;
    isGiven: boolean;
    thresholdUSDC?: number;
  }) => {
    console.log(">>>>>>>>>>>>>>>>>>> fundingVeteranHandler <<<<<<<<<<<<<<<<<<")
    if (isGiven) {
      console.log(`[FundingVeteran] Skipping, accolade already given for wallet: ${wallet}`);
      return false;
    }
  
    const query = `
      query MyQuery($buyer: String!) {
        dutchPurchases(where: {buyer: $buyer}) { fundAmountBNB }
        fairPurchases(where: {buyer: $buyer}) { fundAmountBNB }
        privatePurchases(where: {buyer: $buyer}) { fundAmountBNB }
        subscriptionPurchases(where: {buyer: $buyer}) { fundAmountBNB }
        purchases(where: {buyer: $buyer}) { fundAmountBNB }
      }
    `;
  
    const res: any = await runGraphQLQuery(graph, query, { buyer: wallet });
  
    if (!res?.errors && res?.data) {
      const { dutchPurchases, fairPurchases, privatePurchases, subscriptionPurchases, purchases } = res.data;
  
      console.log(`[FundingVeteran] Purchases fetched for wallet=${wallet}`, {
        dutch: dutchPurchases?.length,
        fair: fairPurchases?.length,
        private: privatePurchases?.length,
        subscription: subscriptionPurchases?.length,
        normal: purchases?.length
      });
  
      // Flatten all purchases into one array
      const allPurchases = [
        ...(dutchPurchases || []),
        ...(fairPurchases || []),
        ...(privatePurchases || []),
        ...(subscriptionPurchases || []),
        ...(purchases || [])
      ];
  
      // Sum total BNB
      const totalBNB = allPurchases.reduce((acc: number, p: any) => {
        const amt = parseFloat(p?.fundAmountBNB ?? "0");
        return acc + amt;
      }, 0);
  
      // Convert to USDC
      const totalUSDC = await convertBNBtoUSDC(totalBNB);
  
      // Count unique sale types where user contributed >0
      const categoriesContributed = [
        dutchPurchases,
        fairPurchases,
        privatePurchases,
        subscriptionPurchases,
        purchases
      ].filter(arr => (arr || []).some((p: any) => parseFloat(p.fundAmountBNB) > 0)).length;
  
      console.log(`[FundingVeteran] Total contributed=${totalBNB} BNB ≈ ${totalUSDC.toFixed(2)} USDC across ${categoriesContributed} categories`);
  
      const meetsThreshold = totalUSDC >= thresholdUSDC;
      let eligible = false;
  
      if (requireMultipleLaunches) {
        // strict rule: threshold AND more than 1 category
        eligible = meetsThreshold && categoriesContributed > 1;
        console.log(`[FundingVeteran] Mode: STRICT → eligible=${eligible}`);
      } else {
        // lenient rule: just threshold
        eligible = meetsThreshold;
        console.log(`[FundingVeteran] Mode: LENIENT → eligible=${eligible}`);
      }
  
      if (eligible) {
        console.log(`[FundingVeteran] ✅ Awarding Funding Veteran to wallet=${wallet}`);
        await insertAccoladeInAccolade(user as User, "funding_veteran");
        if (user) {
          const points = await getAccoladePoints("funding_veteran");
          await createAccoladeLog({
            accoladeName: "Funding Veteran",
            accoladeType: "funding_veteran",
            userId: user.id,
            description: `Invested ${thresholdUSDC}+ USDC across launches`,
            points
          });
        }
        return true;
      } else {
        console.log(`[FundingVeteran] ❌ Not eligible (totalUSDC=${totalUSDC}, categories=${categoriesContributed})`);
      }
    } else {
      console.error(`[FundingVeteran] GraphQL query failed for ${wallet}`, res?.errors);
    }
  
    return false;
  };
  const hasBigProject = async (projects: any[]) => {
    const MIN_USDC = 10000;
  
    // Format unix timestamp to dd-mm-yyyy for CoinGecko
    const formatDate = (ts: string) => {
      const d = new Date(parseInt(ts, 10) * 1000);
      const dd = String(d.getUTCDate()).padStart(2, "0");
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const yyyy = d.getUTCFullYear();
      return `${dd}-${mm}-${yyyy}`;
    };
  
    for (const p of projects) {
      if (!p.totalRaisedBNB || p.totalRaisedBNB === "0") {
        console.log(`[ProjectFounder] Skipping project=${p.id}, no funds raised`);
        continue;
      }
  
      const date = formatDate(p.createdAt);
      const url = `https://api.coingecko.com/api/v3/coins/binancecoin/history?date=${date}&localization=false`;
      const res = await fetch(url);
  
      if (!res.ok) {
        console.warn(`[ProjectFounder] Failed to fetch price for date=${date}, project=${p.id}`);
        continue;
      }
  
      const json = await res.json();
      const price = json?.market_data?.current_price?.usd;
      if (!price) {
        console.warn(`[ProjectFounder] No price data for date=${date}, project=${p.id}`);
        continue;
      }
  
      const raisedUSDC = parseFloat(p.totalRaisedBNB) * price;
      console.log(`[ProjectFounder] Project=${p.id} raised ${p.totalRaisedBNB} BNB ≈ ${raisedUSDC.toFixed(2)} USDC`);
  
      if (raisedUSDC >= MIN_USDC) {
        console.log(`[ProjectFounder] ✅ Project=${p.id} qualifies (≥ ${MIN_USDC} USDC)`);
        return true;
      }
    }
  
    return false;
  };
  const projectFounderHandler = async ({
    wallet,
    graph,
    user,
    isGiven = false
  }: {
    wallet: string;
    graph: string;
    user: User | undefined;
    isGiven: Boolean;
  }) => {
    console.log(">>>>>>>>>>>>>>>>>>> projectFounderHandler <<<<<<<<<<<<<<<<<<")
    if (isGiven) {
      console.log(`[ProjectFounder] Skipping, accolade already given for wallet=${wallet}`);
      return false;
    }
  
    const query = `
      query MyQuery($owner: String!) {
        dutchAuctions(where: { owner: $owner }) {
          id
          totalRaisedBNB
          createdAt
        }
        fairlaunches(where: { owner: $owner }) {
          id
          totalRaisedBNB
          createdAt
        }
        launchpads(where: { owner: $owner }) {
          id
          totalRaisedBNB
          createdAt
        }
        privateSales(where: { owner: $owner }) {
          id
          totalRaisedBNB
          createdAt
        }
        subscriptionPools(where: { owner: $owner }) {
          id
          totalRaisedBNB
          createdAt
        }
      }
    `;
  
    const res: any = await runGraphQLQuery(graph, query, { owner: wallet });
  
    if (res?.errors) {
      console.error(`[ProjectFounder] GraphQL errors for wallet=${wallet}`, res.errors);
      return false;
    }
  
    const {
      dutchAuctions = [],
      fairlaunches = [],
      launchpads = [],
      privateSales = [],
      subscriptionPools = []
    } = res?.data || {};
  
    console.log(`[ProjectFounder] Checking projects for wallet=${wallet}`, {
      dutch: dutchAuctions.length,
      fair: fairlaunches.length,
      launch: launchpads.length,
      private: privateSales.length,
      subs: subscriptionPools.length
    });
    if(dutchAuctions?.lengh > 0){
      const tokenCreationActivity = await getActivityByType(PointsEarningActivityTypes?.dutch_auction?.type || "dutch_auction");
      await createUserActivity({activity_id: tokenCreationActivity.id, points: tokenCreationActivity.points, user_id: user?.id as number});
      await createAccoladeLog({
        accoladeName: "Dutch Auction",
        accoladeType: PointsEarningActivityTypes?.dutch_auction?.type || "dutch_auction",
        userId: user?.id as number,
        description: "Successfully unlocked dutch auction activity",
        points: tokenCreationActivity?.points
      });
      if(user?.id){
        await storage.updateUserPoints(user?.id, tokenCreationActivity?.points);
      }
    }
    // Combine all project types
    const allProjects = [
      ...dutchAuctions,
      ...fairlaunches,
      ...launchpads,
      ...privateSales,
      ...subscriptionPools
    ];
  
    const exists = await hasBigProject(allProjects);
  
    if (exists && user) {
      console.log(`[ProjectFounder] Awarding Project Founder to wallet=${wallet}`);
      await insertAccoladeInAccolade(user, "project_founder");
      const points = await getAccoladePoints("project_founder");
      await createAccoladeLog({
        accoladeName: "Project Founder",
        accoladeType: "project_founder",
        userId: user.id,
        description: "Your project successfully raised 10,000+ USDC",
        points
      });
      return true;
    }
  
    console.log(`[ProjectFounder] ❌ Not eligible for Project Founder, wallet=${wallet}`);
    return false;
  };  
  const hasWhaleFunding = async (data: any) => {
    const MIN_USDC = 10000;
  
    // Sum total BNB from all purchase types
    const allPurchases = [
      ...(data?.data?.dutchPurchases || []),
      ...(data?.data?.fairPurchases || []),
      ...(data?.data?.privatePurchases || []),
      ...(data?.data?.subscriptionPurchases || []),
      ...(data?.data?.purchases || [])
    ];
  
    const totalBNB = allPurchases.reduce((acc: number, p: any) => {
      const amt = parseFloat(p?.fundAmountBNB ?? "0");
      return acc + amt;
    }, 0);
  
    console.log(`[WhaleFunder] Total contributed = ${totalBNB} BNB`);
  
    // Convert to USDC using current price
    const totalUSDC = await convertBNBtoUSDC(totalBNB);
    console.log(`[WhaleFunder] Converted total = ${totalUSDC.toFixed(2)} USDC`);
  
    return totalUSDC >= MIN_USDC;
  };
  // const whaleFunderHandler = async ({
  //   wallet,
  //   graph,
  //   user,
  //   isGiven = false,
  //   thresholdUSDC = 10000
  // }: {
  //   wallet: string;
  //   graph: string;
  //   user: User | undefined;
  //   isGiven: Boolean;
  //   thresholdUSDC?: number;
  // }) => {
  //   console.log(">>>>>>>>>>>>>>>>>>> whaleFunderHandler <<<<<<<<<<<<<<<<<<")
  //   if (isGiven) {
  //     console.log(`[WhaleFunder] Skipping, accolade already given for wallet=${wallet}`);
  //     return false;
  //   }
  
  //   const query = `
  //     query MyQuery($buyer: String!) {
  //       dutchPurchases(where: {buyer: $buyer}) { fundAmountBNB }
  //       fairPurchases(where: {buyer: $buyer}) { fundAmountBNB }
  //       privatePurchases(where: {buyer: $buyer}) { fundAmountBNB }
  //       subscriptionPurchases(where: {buyer: $buyer}) { fundAmountBNB }
  //       purchases(where: {buyer: $buyer}) { fundAmountBNB }
  //     }
  //   `;
  
  //   const res: any = await runGraphQLQuery(graph, query, { buyer: wallet });
  
  //   if (res?.errors) {
  //     console.error(`[WhaleFunder] GraphQL query failed for wallet=${wallet}`, res.errors);
  //     return false;
  //   }
  
  //   const exists = await hasWhaleFunding(res);
  
  //   if (exists && user) {
  //     console.log(`[WhaleFunder] ✅ Awarding Whale Funder to wallet=${wallet}`);
  //     await insertAccoladeInAccolade(user, "whale_funder");
  //     const points = await getAccoladePoints("whale_funder");
  //     await createAccoladeLog({
  //       accoladeName: "Whale Funder",
  //       accoladeType: "whale_funder",
  //       userId: user.id,
  //       description: `You invested ${thresholdUSDC}+ USDC across launches`,
  //       points
  //     });
  //     return true;
  //   }
  
  //   console.log(`[WhaleFunder] ❌ Not eligible, wallet=${wallet}`);
  //   return false;
  // };
  const whaleFunderHandler = async ({
    wallet,
    graph,
    user,
    isGivenWhale = false,
    isGivenSupporter = false,
    thresholdUSDC = 10000
  }: {
    wallet: string;
    graph: string;
    user: User | undefined;
    isGivenWhale: boolean;
    isGivenSupporter: boolean;
    thresholdUSDC?: number;
  }) => {
    console.log(">>>>>>>>>>>>>>>>>>> launchFundingHandlers <<<<<<<<<<<<<<<<<<");
  
    const query = `
      query MyQuery($buyer: String!) {
        dutchPurchases(where: {buyer: $buyer}) { fundAmountBNB id }
        fairPurchases(where: {buyer: $buyer}) { fundAmountBNB id }
        privatePurchases(where: {buyer: $buyer}) { fundAmountBNB id }
        subscriptionPurchases(where: {buyer: $buyer}) { fundAmountBNB id }
        purchases(where: {buyer: $buyer}) { fundAmountBNB id }
      }
    `;
  
    const res: any = await runGraphQLQuery(graph, query, { buyer: wallet });
  
    if (res?.errors) {
      console.error(`[LaunchFundingHandlers] GraphQL query failed for wallet=${wallet}`, res.errors);
      return false;
    }
  
    // =============== Whale Funder Check ===============
    if (!isGivenWhale) {
      const exists = await hasWhaleFunding(res, thresholdUSDC); // your existing helper
      if (exists && user) {
        console.log(`[WhaleFunder] ✅ Awarding Whale Funder to wallet=${wallet}`);
        await insertAccoladeInAccolade(user, "whale_funder");
        const points = await getAccoladePoints("whale_funder");
        await createAccoladeLog({
          accoladeName: "Whale Funder",
          accoladeType: "whale_funder",
          userId: user.id,
          description: `You invested ${thresholdUSDC}+ USDC across launches`,
          points
        });
      } else {
        console.log(`[WhaleFunder] ❌ Not eligible, wallet=${wallet}`);
      }
    }
  
    // =============== Launch Supporter Check ===============
    if (!isGivenSupporter) {
      const categories = [
        "dutchPurchases",
        "fairPurchases",
        "privatePurchases",
        "subscriptionPurchases",
        "purchases"
      ];
  
      const distinctLaunches = categories.filter(
        (c) => res?.data?.[c]?.length > 0
      ).length;
  
      if (distinctLaunches >= 2 && user) {
        console.log(
          `[LaunchSupporter] ✅ Awarding Launch Supporter (participated in ${distinctLaunches} launch types) to wallet=${wallet}`
        );
        await insertAccoladeInAccolade(user, "launch_supporter");
        const points = await getAccoladePoints("launch_supporter");
        await createAccoladeLog({
          accoladeName: "Launch Supporter",
          accoladeType: "launch_supporter",
          userId: user.id,
          description: `You participated in ${distinctLaunches} different token launches`,
          points
        });
      } else {
        console.log(`[LaunchSupporter] ❌ Not eligible, wallet=${wallet}`);
      }
    }
  };
  
  // Genesis / Pioneer / Early Adopter accolades
  const rankBasedAccolades = async ({ user, wallet }: { user: User; wallet: string }) => {
    // Fetch user rank from DB
    const currentRank = await getUserRank(user.id);
    if (!currentRank) return;
    // determine unlocked accolades
    const unlocked: string[] = [];
    if (currentRank <= 10) {
      unlocked.push("genesis_member", "gemlaunch_pioneer", "early_adopter");
    } else if (currentRank <= 50) {
      unlocked.push("gemlaunch_pioneer", "early_adopter");
    } else if (currentRank <= 1000) {
      unlocked.push("early_adopter");
    }
    if (unlocked.length === 0) return;
    // Check activity from BOTH subgraphs
    const launchpadQuery = `
      query ($owner: String!) {
        launchpadCreateds(where: { launchpad: $owner }) {
          id
          info_token
        }
      }
    `;
    const fairlaunchQuery = `
      query ($owner: String!) {
        fairLaunchCreateds(where: { fairLaunch: $owner }) {
          id
          _info_token
        }
      }
    `;
    // run queries separately
    const [launchpadRes, fairlaunchRes]: any[] = await Promise.all([
      runGraphQLQuery(LAUNCHPAD_SUBGRAPH, launchpadQuery, { owner: wallet }),
      runGraphQLQuery(FAIRLAUCH_SUBGRAPH, fairlaunchQuery, { owner: wallet })
    ]);
    const hasActivity =
      (launchpadRes?.data?.launchpadCreateds?.length ?? 0) > 0 ||
      (fairlaunchRes?.data?.fairLaunchCreateds?.length ?? 0) > 0;
    if (!hasActivity) return; // don’t give accolade if no activity
    // award accolades
    for (const accoladeType of unlocked) {
      await insertAccolade(user, accoladeType);
      const points = await getAccoladePoints(accoladeType);
      await createAccoladeLog({
        accoladeName:
          accoladeType === "genesis_member"
            ? "Genesis Member"
            : accoladeType === "gemlaunch_pioneer"
            ? "Gemlaunch Pioneer"
            : "Early Adopter",
        accoladeType,
        userId: user.id,
        description: "Awarded for being an early rank user",
        points,
      });
      // if(user?.id){
      //   await storage.updateUserPoints(user?.id, points);
      // }
    }
  };
  const getUserRank = async (userId: number) => {
    const user = await db.select().from(users).orderBy(asc(users.createdAt));
    const index = user.findIndex(u => u.id === userId);
    return index >= 0 ? index + 1 : null;
  };

  const awardLaunchActivity = async ({
    type,
    accoladeName,
    accoladeType,
    description,
    user
  }: {
    type: ActivityKey;
    accoladeName: string;
    accoladeType: string;
    description: string;
    user: User;
  }) => {
    const activity = await getActivityByType(
      PointsEarningActivityTypes?.[type]?.type || type
    );
  
    if (!activity) {
      console.warn(`[Launch activity] No activity found for type=${type}`);
      return;
    }
  
    // ✅ Create user activity record
    await createUserActivity({
      activity_id: activity.id,
      points: activity.points,
      user_id: user?.id as number
    });
  
    // ✅ Create accolade log
    await createAccoladeLog({
      accoladeName,
      accoladeType,
      userId: user?.id as number,
      description,
      points: activity?.points
    });
  
    // ✅ Update user total points
    if (user?.id) {
      await storage.updateUserPoints(user?.id, activity?.points);
    }
  };
  
  const checkUserPreSaleHandler = async ({
    wallet,
    graph,
    user,
    isGiven = false
  }: {
    wallet: string;
    graph: string;
    user: User;
    isGiven: Boolean;
  }) => {
    if (isGiven) {
      console.log(`[Presale activity] Skipping, accolade already given for wallet=${wallet}`);
      return false;
    }
    const query = `
      query MyQuery($owner: String!) {
        privateSales(where: {owner: $owner}) {
          owner
          softCap
          token
          tokenDecimals
        }
        dutchAuctions(where: {owner: $owner}) {
          owner
          totalRaisedBNB
          totalRaised
          tokenDecimals
          token
          hardCap
        }
        fairlaunches(where: {owner: $owner}) {
          owner
          token
          tokenDecimals
          totalRaised
          totalRaisedBNB
          fundToken
        }
      }
    `;
    const res: any = await runGraphQLQuery(graph, query, { owner: wallet });
    if (res?.data?.privateSales?.length > 0) {
      console.log('[presale] => awarding presale activity');
      await awardLaunchActivity({
        type: "presale",
        accoladeName: "Presale Launch",
        accoladeType: "presale",
        description: "Successfully unlocked presale launch activity",
        user
      });
    }
    
    if (res?.data?.dutchAuctions?.length > 0) {
      console.log('[dutch_auction] => awarding dutch auction activity');
      await awardLaunchActivity({
        type: "dutch_auction",
        accoladeName: "Dutch Auction Launch",
        accoladeType: "dutch_auction",
        description: "Successfully unlocked dutch auction activity",
        user
      });
    }
    
    if (res?.data?.fairlaunches?.length > 0) {
      console.log('[fair_launch] => awarding fair launch activity');
      await awardLaunchActivity({
        type: "fair_launch",
        accoladeName: "Fair Launch",
        accoladeType: "fair_launch",
        description: "Successfully unlocked fair launch activity",
        user
      });
    }
    
  };
  ////////// checks if user has participated in any purchase
  const preSaleParticipantHandler = async ({
    wallet,
    graph,
    user,
    isGiven = false
  }: {
    wallet: string;
    graph: string;
    user: User | undefined;
    isGiven: boolean;
  }) => {
    if (isGiven) {
      console.log(`[Presale Participant] Skipping, already given for wallet=${wallet}`);
      return false;
    }
    console.log(`[Presale Participant] enteredddddddd wallet=${wallet}`);
  
    const query = `
      query MyQuery($buyer: String!) {
        privatePurchases(where: {buyer: $buyer}) {
          buyer
          transactionHash
          id
          fundAmountBNB
          fundAmount
          blockNumber
          blockTimestamp
        }
      }
    `;
  
    try {
      const res: any = await runGraphQLQuery(graph, query, { buyer: wallet });
  
      if (!res?.errors && res?.data?.privatePurchases?.length > 0) {
        console.log("[presale_participant] => awarding presale participant reward");
        await insertAccoladeInAccolade(user as User, "presale_participant");
        const points = await getAccoladePoints("presale_participant");
        console.log(`[TokenCreator] "presale_participant" accolade with ${points} points`);
        await createAccoladeLog({
          accoladeName: "Presale Participant",
          accoladeType: "presale_participant",
          userId: user?.id as number,
          description: "You participated in private sale",
          points
        });
        return true;
      }
      console.log(`[Presale Participant] not found wallet=${wallet}`);
    } catch (err) {
      console.error("[presale_participant] Error:", err);
    }
  
    return false;
  };
  
  
  ////////// AVAILBLE ACCOLADES - Fetching all accolades and marking user claimed accolades
  app.get("/api/available/accolades/:wallet_address", async (req, res) => {
    try {
      const { wallet_address } = req.params;
      const user: User | undefined = await storage.getUserByWalletAddress(wallet_address);
      if (!user) {
        return sendResponse(res, 500, "Invalid wallet address found", null);
      }
      const givenAccolades = await getGivenAccoladesForUser(user.id);
      // console.log({givenAccolades});
      await insertAccolade( user , 'referrer' );
      await Promise.all([
        tokenCreatorAndSerialCreator({ wallet: wallet_address, graph: TOKEN_SUBGRAPH, user, launchpadGraph: LAUNCHPAD_SUBGRAPH, isGiven: givenAccolades.includes("token_creator") }),
        firstFunderReward({ wallet: wallet_address, graph: NEW_GEMLAUNCH_SUBGRAPH, user, isGiven: givenAccolades.includes("first_funding") }),
        fairlaunchMaster({ wallet: wallet_address, graph: NEW_GEMLAUNCH_SUBGRAPH, user, isGiven: givenAccolades.includes("launch_master") }),
        fundingVeteranHandler({ wallet: wallet_address, graph: NEW_GEMLAUNCH_SUBGRAPH, user, isGiven: givenAccolades.includes("funding_veteran") }),
        projectFounderHandler({ wallet: wallet_address, graph: NEW_GEMLAUNCH_SUBGRAPH, user, isGiven: givenAccolades.includes("project_founder") }),
        whaleFunderHandler({ wallet: wallet_address, graph: NEW_GEMLAUNCH_SUBGRAPH, user, isGivenWhale: givenAccolades.includes("whale_funder"), isGivenSupporter:givenAccolades.includes("launch_supporter") }),
        preSaleParticipantHandler({ wallet: wallet_address, graph: NEW_GEMLAUNCH_SUBGRAPH, user, isGiven: givenAccolades.includes("presale_participant") }),
        rankBasedAccolades({ user, wallet: wallet_address })
      ]);
      let ACCOLADE_COLLECTOR_THRESHOLD = 2;
      if(!givenAccolades.includes("accolade_collector") && givenAccolades.length >= ACCOLADE_COLLECTOR_THRESHOLD){
        console.log("[accolade_collector] giving these points")
        await insertAccoladeInAccolade(user, "accolade_collector");
        const points = await getAccoladePoints("accolade_collector");
        await createAccoladeLog({
          accoladeName: "Accolade Collector",
          accoladeType: "accolade_collector",
          userId: user.id,
          description: "Your Have earned accolade collector accolade",
          points
        });
      }else{
        console.log("[accolade_collector] skipping......")
      }
      const accolades = await getAllAccoladesForUser(user.id);
      sendResponse(res, 200, "All accolades fetched successfully", accolades?.rows || []);
    } catch (err) {
      console.error({ err });
      sendResponse(res, 500, "Something went wrong", null);
    }
  });
  
  ////////// GET POINTS EARNING ACTIVITIES - To get points earning activities and mark isGiven if user has claimed it
  app.get("/api/points/earning/activities/:walletAddress", async (req, res) => {
    try{
      const { walletAddress } = req.params;
      const user: User | undefined = await storage.getUserByWalletAddress(walletAddress);
      console.log({user})
      await checkUserPreSaleHandler({graph: NEW_GEMLAUNCH_SUBGRAPH, isGiven: false, user: user as User , wallet: walletAddress}); // to be fixed is given and wallet
      // here
      if(user?.id){
        const activities = await getUserActivities(user?.id);
        return sendResponse(res, 200, "Activities fetched Successfully", activities || []); 
      }
      return sendResponse(res, 400, "User not found", null); 
    }catch(err: any){
      return sendResponse(res, 400, err?.message || "Something went wrong while fetching activities", null); 
    }
  })

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



