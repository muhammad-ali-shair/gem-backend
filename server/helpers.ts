import { Response } from "express";
import fetch from "node-fetch";
import { db } from "./db";
import { accolades, accoladesHistory, gemAccolades, pointEarningActivities, userPointEarningActivities } from "@shared/schema";
import { and, desc, eq, sql } from "drizzle-orm";


///////////////// ---- TYPES ---- ///////////////////
    export interface LAUNCHPAD {
        token: string;
        softCap: string;
        owner: string;
        totalRaised: string;
    }
    export interface Accolade {
        id: number;
        symbol: string;
        name: string;
        description: string;
        icon: string;
        category: string;
        level: number;
        criteria: string;
        pointsBonus: number;
        rarity: string;
    }
    export interface UserAccolade {
        id: number;
        userId: number;
        accoladeType: string;
        level: number;
        multiplier: number;
        unlockedAt: string;
    }
    export interface AccoladeWithStatus extends Accolade {
        isGiven: boolean;
    }
    export interface CreateAccoladeLogInput {
      accoladeType: string;
      accoladeName: string;
      description?: string;
      userId: number;
      points?: number;
    };

    export type Purchase = {
      buyer: string;
      amount: string; // BigInt-compatible string
    };
    
    export type FairLaunch = {
      softCap: string;
      purchases: Purchase[];
    };
    export type CreateUserActivityInput = {
      user_id: number;
      activity_id: number;
      points: number;
    };
/////////////////////// ------ HELPERS ----- //////////////////////
    export const runGraphQLQuery = async (url: string, query: string, variables = {}) => {
        try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, variables }),
        });
        const data =  await response.json();
        return data
        } catch (err: any) {
        console.error("GraphQL request error:", err.message);
        throw err;
        }
    };

    export const getTotalRaisedInBNB = (launchpads: LAUNCHPAD[]) => {
        const total = launchpads.reduce((acc, lp) => {
        return acc + Number(lp.totalRaised);
        }, 0);
        return total / 1e18;
    };

    export const convertBNBtoUSDC = async (totalBNB: number) => {
      try {
        const url = "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd";
        const response = await fetch(url);
    
        if (!response.ok) {
          throw new Error(`Failed to fetch price: ${response.status} ${response.statusText}`);
        }
    
        const data: any = await response.json();
    
        if (!data?.binancecoin?.usd) {
          console.error("Unexpected response from CoinGecko:", data);
          throw new Error("BNB price not available");
        }
    
        const bnbPrice = data.binancecoin.usd;
        return totalBNB * bnbPrice;
      } catch (err) {
        console.error("convertBNBtoUSDC error:", err);
        return 0; // or throw err if you want to stop execution
      }
    };
    

    export const countSuccessfulLaunchpads = (launchpads:LAUNCHPAD[]) => {
        return launchpads.filter(lp => BigInt(lp.totalRaised) >= BigInt(lp.softCap)).length;
    };

    export const sendResponse = (res:Response, statusCode: number, message: string, data: any) => {
        return res.status(200).json({statusCode, message, data});
    };

    export const markUserAccolades = (
        allAccolades: Accolade[],
        userAccolades: UserAccolade[]
      ): AccoladeWithStatus[] => {
        const userAccoladeTypes = new Set(userAccolades.map(acc => acc.accoladeType));
      
        return allAccolades.map(acc => ({
          ...acc,
          isGiven: userAccoladeTypes.has(acc.symbol), // match symbol ↔ accoladeType
        }));
    };

    export const isAnyFairLaunchSuccessful = (fairLaunches: FairLaunch[]): boolean => {
      return fairLaunches.some((launch) => {
        const total = launch.purchases.reduce(
          (sum, p) => sum + BigInt(p.amount),
          BigInt(0)
        );
        return total >= BigInt(launch.softCap);
      });
    };
    
    /////////////////// ------ DATABASE ------- ///////////////////////
    export const getAccoladeTypesByUser = async (userId: number) => {
        try {
          return await db
            .select()
            .from(accolades)
            .where(eq(accolades.userId, userId));
        } catch (err) {
          console.error("Error fetching accolade types:", err);
          throw err;
        }
    };

    export const getAllAccolades = async () => {
        try {
          return await db.select().from(gemAccolades);
        } catch (err) {
          console.error("Error fetching accolades:", err);
          throw err;
        }
    }

    export const getGivenAccoladesForUser = async (userId: number) => {
      try {
        const result = await db.execute(sql`
          SELECT accolade_type
          FROM accolades
          WHERE user_id = ${userId}
        `);
    
        // Flatten to array of strings
        return result.rows.map((row: any) => row.accolade_type);
      } catch (err) {
        console.error("Error fetching given accolades:", err);
        throw err;
      }
    };
    

    export const getAllAccoladesForUser = async (userId: number) => {
        try {
          return await db.execute(sql`
            SELECT 
              g.id,
              g.symbol,
              g.name,
              g.description,
              g.icon,
              g.category,
              g.level,
              g.criteria,
              g.points_bonus AS "pointsBonus",
              g.rarity,
              CASE 
                WHEN EXISTS (
                  SELECT 1 
                  FROM accolades a
                  WHERE a.accolade_type = g.symbol
                    AND a.user_id = ${userId}
                ) THEN true 
                ELSE false 
              END AS "isGiven"
            FROM gem_accolades g
            ORDER BY g.id
          `);          
        } catch (err) {
          console.error("Error fetching accolades with join:", err);
          throw err;
        }
    };

    
    export const getPointsEarningActivityByType = async (type: string) => {
      const result = await db
        .select({ points: pointEarningActivities.points })
        .from(pointEarningActivities)
        .where(eq(pointEarningActivities.type, type))
        .limit(1);
      return result[0]?.points ?? 0; 
    };

    export const createAccoladeLog = async (input: CreateAccoladeLogInput) => {
      console.log("creatinggggggg accolade called >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", input.accoladeName)
      if(input.accoladeType === "gem_launch_points"){
        const [newLog] = await db
        .insert(accoladesHistory)
        .values({
          accoladeType: input.accoladeType,
          accoladeName: input.accoladeName,
          description: input.description,
          userId: input.userId,
          points: input.points ?? 0,
        })
        .returning();
      return newLog;
      }
      const [existing] = await db
        .select()
        .from(accoladesHistory)
        .where(
          and(
            eq(accoladesHistory.userId, input.userId),
            eq(accoladesHistory.accoladeType, input.accoladeType)
          )
        )
        .limit(1);
      if (existing) {
        return existing;
      }
      const [newLog] = await db
        .insert(accoladesHistory)
        .values({
          accoladeType: input.accoladeType,
          accoladeName: input.accoladeName,
          description: input.description,
          userId: input.userId,
          points: input.points ?? 0,
        })
        .returning();
      return newLog;
    };
    
    type GetUserAccoladesParams = {
      userId: string;
      page?: number;
      limit?: number;
    };
    
    export const getUserAccoladesHistory = async ({
      userId,
      page = 1,
      limit = 10,
    }: GetUserAccoladesParams) => {
      const offset = (page - 1) * limit;
     console.log({userId}) 
      const rows = await db
        .select({
          id: accoladesHistory.id,
          accoladeType: accoladesHistory.accoladeType,
          accoladeName: accoladesHistory.accoladeName,
          description: accoladesHistory.description,
          userId: accoladesHistory.userId,
          createdAt: accoladesHistory.createdAt,
          points: accoladesHistory.points,
        })
        .from(accoladesHistory)
        .where(eq(accoladesHistory.userId, userId))
        .orderBy(desc(accoladesHistory.createdAt))
        .limit(limit)
        .offset(offset);
    
      return rows;
    };

    export const getAllPointEarningActivities = async () => {
      return await db
        .select()
        .from(pointEarningActivities)
        .orderBy(pointEarningActivities.id);
    };

    export async function getUserActivities(userId: number) {
      // Fetch all activities
      const allActivities = await db.select().from(pointEarningActivities);
    
      // Fetch user’s unlocked activities
      const userActivities = await db
        .select({ activityId: userPointEarningActivities.activityId })
        .from(userPointEarningActivities)
        .where(eq(userPointEarningActivities.userId, userId));
    
      const unlockedIds = new Set(userActivities.map((ua) => ua.activityId));
  
      // Merge isUnlocked flag
      return allActivities.map((activity) => ({
        ...activity,
        isUnlocked: unlockedIds.has(activity.id),
      }));
    }

    export const createUserActivity = async (input: CreateUserActivityInput) => {
      const [newActivity] = await db
        .insert(userPointEarningActivities)
        .values({
          userId: input.user_id,
          activityId:input.activity_id,
          points: input.points,
        })
        .returning();
      return newActivity;
    };

    export const getActivityByType = async (type: string) => {
      const [activity] = await db
        .select()
        .from(pointEarningActivities)
        .where(eq(pointEarningActivities.type, type));
    
      return activity || null;
    };
    export const getUserPointsEarningActivities = async (userId: string) => {
      const [activity] = await db
        .select()
        .from(userPointEarningActivities)
        .where(eq(userPointEarningActivities.userId, userId));
      return activity || null;
    };

    ///////////////////////////////////////////////////