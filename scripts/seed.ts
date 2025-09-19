import { db } from "../server/db"; // adjust path to your db connection
import {
  users,
  activities,
  referrals,
  accolades,
  pointConfigs,
  blockchainEvents,
  userWallets,
  gemAccolades,
  pointEarningActivities
} from "../shared/schema";
import { ACCOLADES } from "../shared/accolades"; // your accolades definitions

async function main() {
  console.log("🌱 Seeding database...");

  // --- USERS ---
  const mainUser = await db
    .insert(users)
    .values({
      walletAddress: "0x2d9b878DD5f779aF723a430F8d56f21dAc847592",
      username: "main_user",
      displayName: "Main Account",
      avatar: "https://placehold.co/100x100",
      bio: "This is the main seeded account.",
      customReferralCode: "MAIN123",
      referralCode: "REF-MAIN",
      isInfluencer: true,
      isMainAccount: true,
    })
    .returning();

  const [main] = mainUser;

  // Add dummy users
  const dummyUsers = await db
    .insert(users)
    .values([
      {
        walletAddress: "0x1111111111111111111111111111111111111111",
        username: "alice",
        displayName: "Alice",
        avatar: "https://placehold.co/100x100",
        bio: "Loves presales",
        customReferralCode: "ALICE123",
        referralCode: "REF-ALICE",
        referredBy: main.id,
      },
      {
        walletAddress: "0x2222222222222222222222222222222222222222",
        username: "bob",
        displayName: "Bob",
        avatar: "https://placehold.co/100x100",
        bio: "Big on DeFi",
        customReferralCode: "BOB123",
        referralCode: "REF-BOB",
        referredBy: main.id,
      },
    ])
    .returning();
    // POINTS EARNING ACTIVITIES
    await db.insert(pointEarningActivities).values([
      {
        type: "token_creation",
        title: "Token Creation",
        points: 100,
        description: "Create a new token on Gemlaunch",
        icon: "Rocket",
        color: "primary",
      },
      {
        type: "fair_launch",
        title: "Fair Launch",
        points: 250,
        description: "Launch a fair launch campaign",
        icon: "Flame",
        color: "green",
      },
      {
        type: "presale",
        title: "Presale Launch",
        points: 300,
        description: "Create and run a presale",
        icon: "Crown",
        color: "yellow",
      },
      {
        type: "dutch_auction",
        title: "Dutch Auction",
        points: 200,
        description: "Host a Dutch auction",
        icon: "Gavel",
        color: "purple",
      },
      {
        type: "volume_contribution",
        title: "Volume Contribution",
        points: 1,
        description: "Earn points based on funding volume",
        icon: "DollarSign",
        color: "primary",
        suffix: "pt / $1",
      },
      {
        type: "referral",
        title: "Successful Referral",
        points: 50,
        description: "User joins and contributes $20+ or creates token/presale",
        icon: "Users",
        color: "blue",
      },
      {
        type: "welcome_bonus",
        title: "Welcome Bonus",
        points: 100,
        description: "First-time registration bonus",
        icon: "Crown",
        color: "primary",
      },
    ]);
    

  // --- USER WALLETS ---
  await db.insert(userWallets).values([
    {
      userId: main.id,
      walletAddress: "0x2d9b878DD5f779aF723a430F8d56f21dAc847592",
      label: "Main Wallet",
      isPrimary: true,
    },
    {
      userId: dummyUsers[0].id,
      walletAddress: "0x3333333333333333333333333333333333333333",
      label: "Alice Secondary",
      isPrimary: false,
    },
  ]);

  // --- POINT CONFIGS ---
  await db.insert(pointConfigs).values([
    {
      activityType: "token_creation",
      basePoints: 100,
      description: "Points for creating a new token",
    },
    {
      activityType: "referral",
      basePoints: 50,
      description: "Points for referring a user",
     },
    {
      activityType: "social_share",
      basePoints: 10,
      description: "Points for sharing on social media",
    },
  ]);

  // --- ACTIVITIES ---
  await db.insert(activities).values([
    {
      userId: main.id,
      activityType: "token_creation",
      points: 100,
      transactionHash: "0xtxhash1",
      blockNumber: 123456,
      metadata: JSON.stringify({ token: "GEM" }),
    },
    {
      userId: dummyUsers[0].id,
      activityType: "referral",
      points: 50,
      transactionHash: "0xtxhash2",
      blockNumber: 123457,
      metadata: JSON.stringify({ referredUser: dummyUsers[1].id }),
    },
  ]);

  // --- REFERRALS ---
  await db.insert(referrals).values({
    referrerId: main.id,
    refereeId: dummyUsers[0].id,
    pointsEarned: 50,
    isQualified: true,
    qualificationAmount: 25.0,
  });

  // --- ACCOLADES (from your ACCOLADES constant) ---
  await db.insert(accolades).values(
    ACCOLADES.map((a) => ({
      userId: main.id, // give all accolades to main user
      accoladeType: a.symbol,
      level: a.level,
      multiplier: 1.0,
    }))
  );

   await db.insert(gemAccolades).values(
    ACCOLADES.map((a) => ({
      symbol: a.symbol,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      level: a.level,
      criteria: a.criteria,
      pointsBonus: a.pointsBonus,
      rarity: a.rarity,
    }))
  );

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
