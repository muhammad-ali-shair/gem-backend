type ActivityKey =
  | "token_creation"
  | "fair_launch"
  | "presale"
  | "dutch_auction"
  | "volume_contribution"
  | "referral"
  | "welcome_bonus";

type Activity = {
  type: ActivityKey;
  title: string;
  points: number;
  description: string;
  color: string;
  suffix?: string;
};

export const PointsEarningActivityTypes: Record<ActivityKey, Activity> = {
  token_creation: {
    type: "token_creation",
    title: "Token Creation",
    points: 100,
    description: "Create a new token on Gemlaunch",
    color: "primary",
  },
  fair_launch: {
    type: "fair_launch",
    title: "Fair Launch",
    points: 250,
    description: "Launch a fair launch campaign",
    color: "green",
  },
  presale: {
    type: "presale",
    title: "Presale Launch",
    points: 300,
    description: "Create and run a presale",
    color: "yellow",
  },
  dutch_auction: {
    type: "dutch_auction",
    title: "Dutch Auction",
    points: 200,
    description: "Host a Dutch auction",
    color: "purple",
  },
  volume_contribution: {
    type: "volume_contribution",
    title: "Volume Contribution",
    points: 1,
    description: "Earn points based on funding volume",
    color: "primary",
    suffix: "pt / $1",
  },
  referral: {
    type: "referral",
    title: "Successful Referral",
    points: 50,
    description: "User joins and contributes $20+ or creates token/presale",
    color: "blue",
  },
  welcome_bonus: {
    type: "welcome_bonus",
    title: "Welcome Bonus",
    points: 100,
    description: "First-time registration bonus",
    color: "primary",
  },
};
