export interface AccoladeDefinition {
  id?: number; // Optional ID field for database use
  symbol: string;
  name: string;
  description: string;
  icon: string;
  category: 'pioneer' | 'funding' | 'social' | 'creator' | 'elite' | 'streak';
  level: number;
  criteria: string;
  pointsBonus: number;
  multiplier?: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

// export const ACCOLADES: AccoladeDefinition[] = [
//   // PIONEER CATEGORY (Keep first 3 at top as requested)
//   {
//     symbol: 'genesis_member',
//     name: 'Genesis Member',
//     description: 'Among the first 10 users on Gemlaunch.',
//     icon: 'Crown',
//     category: 'pioneer',
//     level: 1,
//     criteria: 'Be among the first 10 users',
//     pointsBonus: 5000,
//     rarity: 'legendary'
//   },
//   {
//     symbol: 'gemlaunch_pioneer',
//     name: 'Gemlaunch Pioneer',
//     description: 'One of the first 50 users to join the Gemlaunch ecosystem!',
//     icon: 'Rocket',
//     category: 'pioneer',
//     level: 2,
//     criteria: 'Be among the first 50 users to connect your wallet',
//     pointsBonus: 2000,
//     rarity: 'rare'
//   },
//   {
//     symbol: 'early_adopter',
//     name: 'Early Adopter',
//     description: 'Among the first 1000 users on Gemlaunch.',
//     icon: 'Star',
//     category: 'pioneer',
//     level: 3,
//     criteria: 'Be among the first 1,000 users',
//     pointsBonus: 500,
//     rarity: 'uncommon'
//   },

//   // COMMON RARITY ACCOLADES
//   {
//     symbol: 'first_funding',
//     name: 'First Funder',
//     description: 'Fund your first token launch on Gemlaunch.',
//     icon: 'Coins',
//     category: 'funding',
//     level: 1,
//     criteria: 'Participate in 1 token funding',
//     pointsBonus: 200,
//     rarity: 'common'
//   },
//   {
//     symbol: 'token_creator',
//     name: 'Token Creator',
//     description: 'Launch your first token on Gemlaunch.',
//     icon: 'Target',
//     category: 'creator',
//     level: 1,
//     criteria: 'Create 1 token',
//     pointsBonus: 200,
//     rarity: 'common'
//   },
//   {
//     symbol: 'presale_participant',
//     name: 'Presale Participant',
//     description: 'Participated in a token presale on the platform.',
//     icon: 'DollarSign',
//     category: 'funding',
//     level: 1,
//     criteria: 'Participate in a token presale',
//     pointsBonus: 150,
//     rarity: 'common'
//   },
//   {
//     symbol: 'daily_visitor',
//     name: 'Daily Visitor',
//     description: 'Visit the platform for 7 consecutive days.',
//     icon: 'Calendar',
//     category: 'streak',
//     level: 1,
//     criteria: 'Login for 7 consecutive days',
//     pointsBonus: 100,
//     rarity: 'common'
//   },

//   // UNCOMMON RARITY ACCOLADES
//   {
//     symbol: 'funding_veteran',
//     name: 'Funding Veteran', 
//     description: 'Veteran token funder with significant investment activity.',
//     icon: 'Shield',
//     category: 'funding',
//     level: 2,
//     criteria: 'Fund 10+ different token launches',
//     pointsBonus: 800,
//     rarity: 'uncommon'
//   },
//   {
//     symbol: 'launch_master',
//     name: 'Launch Master',
//     description: 'Master of token launches with multiple successful projects.',
//     icon: 'Trophy',
//     category: 'creator',
//     level: 2,
//     criteria: 'Successfully launch 5+ tokens',
//     pointsBonus: 1000,
//     rarity: 'uncommon'
//   },
//   {
//     symbol: 'launch_supporter',
//     name: 'Launch Supporter',
//     description: 'Support multiple token launches with funding.',
//     icon: 'TrendingUp',
//     category: 'funding',
//     level: 2,
//     criteria: 'Fund 5+ different token launches',
//     pointsBonus: 800,
//     rarity: 'uncommon'
//   },
//   {
//     symbol: 'funding_veteran',
//     name: 'Funding Veteran',
//     description: 'Contributed significant funding across multiple token launches.',
//     icon: 'BarChart3',
//     category: 'funding',
//     level: 2,
//     criteria: 'Fund 10+ different token launches',
//     pointsBonus: 1200,
//     rarity: 'uncommon'
//   },
//   {
//     symbol: 'launch_loyalist',
//     name: 'Launch Loyalist',
//     description: 'Support token launches by holding funded tokens long-term.',
//     icon: 'Gem',
//     category: 'funding',
//     level: 2,
//     criteria: 'Hold funded tokens for 30+ days without selling',
//     pointsBonus: 750,
//     multiplier: 1.05,
//     rarity: 'uncommon'
//   },
//   {
//     symbol: 'serial_creator',
//     name: 'Serial Creator',
//     description: 'Launch 5+ tokens on Gemlaunch.',
//     icon: 'Factory',
//     category: 'creator',
//     level: 2,
//     criteria: 'Create 5+ tokens',
//     pointsBonus: 1000,
//     multiplier: 1.15,
//     rarity: 'uncommon'
//   },
//   {
//     symbol: 'launch_master',
//     name: 'Launch Master',
//     description: 'Successfully completed a fair launch on the platform.',
//     icon: 'Zap',
//     category: 'creator',
//     level: 2,
//     criteria: 'Complete a successful fair launch',
//     pointsBonus: 500,
//     rarity: 'uncommon'
//   },
//   {
//     symbol: 'referrer',
//     name: 'Referrer',
//     description: 'Successfully refer 5 friends to join Gemlaunch.',
//     icon: 'Handshake',
//     category: 'social',
//     level: 1,
//     criteria: 'Refer 5 friends who join and connect wallets',
//     pointsBonus: 500,
//     rarity: 'uncommon'
//   },
//   {
//     symbol: 'consistent_user',
//     name: 'Consistent User',
//     description: 'Visit the platform for 30 consecutive days.',
//     icon: 'CalendarCheck',
//     category: 'streak',
//     level: 2,
//     criteria: 'Login for 30 consecutive days',
//     pointsBonus: 500,
//     multiplier: 1.1,
//     rarity: 'uncommon'
//   },
//   {
//     symbol: 'social_influencer',
//     name: 'Social Influencer',
//     description: 'Created 25 high-quality social media mentions',
//     icon: 'MessageCircle',
//     category: 'social',
//     level: 1,
//     criteria: 'Create 25 authentic social media mentions with 70+ authenticity score',
//     pointsBonus: 1000,
//     multiplier: 1.1,
//     rarity: 'uncommon'
//   },
//   {
//     symbol: 'community_voice',
//     name: 'Community Voice',
//     description: 'Consistent quality social engagement',
//     icon: 'Users',
//     category: 'social',
//     level: 1,
//     criteria: 'Maintain 80+ average authenticity score across 10+ mentions',
//     pointsBonus: 750,
//     multiplier: 1.05,
//     rarity: 'common'
//   },

//   // RARE RARITY ACCOLADES
//   {
//     symbol: 'whale_funder',
//     name: 'Whale Funder',
//     description: 'Provide $10,000+ in total funding across token launches.',
//     icon: 'Waves',
//     category: 'funding',
//     level: 3,
//     criteria: 'Contribute $10,000+ in total funding',
//     pointsBonus: 3000,
//     multiplier: 1.1,
//     rarity: 'rare'
//   },
//   {
//     symbol: 'influencer',
//     name: 'Influencer',
//     description: 'Bring 20+ new users to the platform.',
//     icon: 'Megaphone',
//     category: 'social',
//     level: 2,
//     criteria: 'Refer 20+ users who join and connect wallets',
//     pointsBonus: 2000,
//     multiplier: 1.2,
//     rarity: 'rare'
//   },
//   {
//     symbol: 'platform_devotee',
//     name: 'Platform Devotee',
//     description: 'Visit the platform for 100 consecutive days.',
//     icon: 'CalendarHeart',
//     category: 'streak',
//     level: 3,
//     criteria: 'Login for 100 consecutive days',
//     pointsBonus: 2000,
//     multiplier: 1.25,
//     rarity: 'rare'
//   },
//   {
//     symbol: 'accolade_collector',
//     name: 'Accolade Collector',
//     description: 'Master achievement hunter who has earned 20 different accolades.',
//     icon: 'Shield',
//     category: 'elite',
//     level: 1,
//     criteria: 'Earn 20 different accolades',
//     pointsBonus: 2500,
//     multiplier: 1.15,
//     rarity: 'rare'
//   },

//   // EPIC RARITY ACCOLADES
//   {
//     symbol: 'project_founder',
//     name: 'Project Founder',
//     description: 'Successfully launch a token that reaches $10K+ market cap.',
//     icon: 'Trophy',
//     category: 'creator',
//     level: 3,
//     criteria: 'Launch a token that reaches $10K+ market cap',
//     pointsBonus: 5000,
//     multiplier: 1.25,
//     rarity: 'epic'
//   },
//   {
//     symbol: 'ambassador',
//     name: 'Ambassador',
//     description: 'Exceptional community contribution and leadership.',
//     icon: 'Award',
//     category: 'social',
//     level: 3,
//     criteria: 'Refer 50+ users and maintain high engagement',
//     pointsBonus: 5000,
//     multiplier: 1.3,
//     rarity: 'epic'
//   },

//   // LEGENDARY RARITY ACCOLADES
//   {
//     symbol: 'volume_king',
//     name: 'Volume King',
//     description: 'Exceptional funding volume contribution.',
//     icon: 'Crown',
//     category: 'elite',
//     level: 1,
//     criteria: 'Contribute $100,000+ total volume',
//     pointsBonus: 10000,
//     multiplier: 1.5,
//     rarity: 'legendary'
//   },
//   {
//     symbol: 'gemlaunch_legend',
//     name: 'Gemlaunch Legend',
//     description: 'Ultimate achievement for platform mastery.',
//     icon: 'Sparkles',
//     category: 'elite',
//     level: 1,
//     criteria: 'Complete all major platform milestones',
//     pointsBonus: 25000,
//     multiplier: 2.0,
//     rarity: 'legendary'
//   }
// ];


export const ACCOLADES: AccoladeDefinition[] = [
  // PIONEER CATEGORY (Keep first 3 at top as requested)
  {
    symbol: 'genesis_member',
    name: 'Genesis Member',
    description: 'Among the first 10 users on Gemlaunch.',
    icon: 'Crown',
    category: 'pioneer',
    level: 1,
    criteria: 'Any transaction on all Smart contracts',
    pointsBonus: 5000,
    rarity: 'legendary'
  },
  {
    symbol: 'gemlaunch_pioneer',
    name: 'Gemlaunch Pioneer',
    description: 'One of the first 50 users to join the Gemlaunch ecosystem!',
    icon: 'Rocket',
    category: 'pioneer',
    level: 2,
    criteria: 'Any transaction on all Smart contracts',
    pointsBonus: 2000,
    rarity: 'rare'
  },
  {
    symbol: 'early_adopter',
    name: 'Early Adopter',
    description: 'Among the first 1000 users on Gemlaunch.',
    icon: 'Star',
    category: 'pioneer',
    level: 3,
    criteria: 'Any transaction on all Smart contracts',
    pointsBonus: 500,
    rarity: 'uncommon'
  },
    {
    symbol: 'daily_visitor',
    name: 'Daily Visitor',
    description: 'Visit the platform for 7 consecutive days.',
    icon: 'Calendar',
    category: 'streak',
    level: 1,
    criteria: 'Login for 7 consecutive days',
    pointsBonus: 100,
    rarity: 'common'
  },

  // COMMON RARITY ACCOLADES
  {
    symbol: 'first_funding',
    name: 'First Funder',
    description: 'Fund your first token launch on Gemlaunch.',
    icon: 'Coins',
    category: 'funding',
    level: 1,
    criteria: 'Deposit in any Launchpad created',
    pointsBonus: 200,
    rarity: 'common'
  },
  {
    symbol: 'token_creator',
    name: 'Token Creator',
    description: 'Launch your first token on Gemlaunch.',
    icon: 'Target',
    category: 'creator',
    level: 1,
    criteria: 'Create Token on Gemlaunch',
    pointsBonus: 200,
    rarity: 'common'
  },
  {
    symbol: 'presale_participant',
    name: 'Presale Participant',
    description: 'Participated in a token presale on the platform.',
    icon: 'DollarSign',
    category: 'funding',
    level: 1,
    criteria: 'Deposit in any Launchpad created',
    pointsBonus: 150,
    rarity: 'common'
  },

  // UNCOMMON RARITY ACCOLADES
  {
    symbol: 'funding_veteran',
    name: 'Funding Veteran',
    description: 'Veteran token funder with significant investment activity.',
    icon: 'Shield',
    category: 'funding',
    level: 2,
    criteria: 'Highest Fund Raised in Stable (USDC)',
    pointsBonus: 800,
    rarity: 'uncommon'
  },
  {
    symbol: 'launch_master',
    name: 'Launch Master',
    description: 'Master of token launches with multiple successful projects.',
    icon: 'Trophy',
    category: 'creator',
    level: 2,
    criteria: 'Highest Fund Raised in Stable (USDC)',
    pointsBonus: 1000,
    rarity: 'uncommon'
  },
  {
    symbol: 'launch_supporter',
    name: 'Launch Supporter',
    description: 'Support multiple token launches with funding.',
    icon: 'TrendingUp',
    category: 'funding',
    level: 2,
    criteria: 'Invest in Multiple Token sales / Deposit in any Launchpad created',
    pointsBonus: 800,
    rarity: 'uncommon'
  },
  {
    symbol: 'launch_loyalist',
    name: 'Launch Loyalist',
    description: 'Support token launches by holding funded tokens long-term.',
    icon: 'Gem',
    category: 'funding',
    level: 2,
    criteria: '',
    pointsBonus: 750,
    multiplier: 1.05,
    rarity: 'uncommon'
  },
  {
    symbol: 'serial_creator',
    name: 'Serial Creator',
    description: 'Launch 5+ tokens on Gemlaunch.',
    icon: 'Factory',
    category: 'creator',
    level: 2,
    criteria: 'Create 5 Tokens on gemlaunch',
    pointsBonus: 1000,
    multiplier: 1.15,
    rarity: 'uncommon'
  },
  {
    symbol: 'launch_master',
    name: 'Launch Master',
    description: 'Successfully completed a fair launch on the platform.',
    icon: 'Zap',
    category: 'creator',
    level: 2,
    criteria: 'Complete Fair launch funding',
    pointsBonus: 500,
    rarity: 'uncommon'
  },

  // RARE RARITY ACCOLADES
  {
    symbol: 'whale_funder',
    name: 'Whale Funder',
    description: 'Provide $10,000+ in total funding across token launches.',
    icon: 'Waves',
    category: 'funding',
    level: 3,
    criteria: 'Invested 10000+ in Token sales in Stables (USDC)',
    pointsBonus: 3000,
    multiplier: 1.1,
    rarity: 'rare'
  },
  {
    symbol: 'influencer',
    name: 'Influencer',
    description: 'Bring 20+ new users to the platform.',
    icon: 'Megaphone',
    category: 'social',
    level: 2,
    criteria: 'Referring 20+ users',
    pointsBonus: 2000,
    multiplier: 1.2,
    rarity: 'rare'
  },
  {
    symbol: 'platform_devotee',
    name: 'Platform Devotee',
    description: 'Visit the platform for 100 consecutive days.',
    icon: 'CalendarHeart',
    category: 'streak',
    level: 3,
    criteria: '',
    pointsBonus: 2000,
    multiplier: 1.25,
    rarity: 'rare'
  },
  {
    symbol: 'accolade_collector',
    name: 'Accolade Collector',
    description: 'Master achievement hunter who has earned 20 different accolades.',
    icon: 'Shield',
    category: 'elite',
    level: 1,
    criteria: 'If user has acheived any 20 accolades',
    pointsBonus: 2500,
    multiplier: 1.15,
    rarity: 'rare'
  },

  // EPIC RARITY ACCOLADES
  {
    symbol: 'project_founder',
    name: 'Project Founder',
    description: 'Successfully launch a token that reaches $10K+ market cap.',
    icon: 'Trophy',
    category: 'creator',
    level: 3,
    criteria: 'If Token was able to generate 10000 USD Stable in Funding',
    pointsBonus: 5000,
    multiplier: 1.25,
    rarity: 'epic'
  },

  // LEGENDARY RARITY ACCOLADES
  {
    symbol: 'volume_king',
    name: 'Volume King',
    description: 'Exceptional funding volume contribution.',
    icon: 'Crown',
    category: 'elite',
    level: 1,
    criteria: 'Highest Fund volume',
    pointsBonus: 10000,
    multiplier: 1.5,
    rarity: 'legendary'
  },
  {
    symbol: 'gemlaunch_legend',
    name: 'Gemlaunch Legend',
    description: 'Ultimate achievement for platform mastery.',
    icon: 'Sparkles',
    category: 'elite',
    level: 1,
    criteria: '',
    pointsBonus: 25000,
    multiplier: 2.0,
    rarity: 'legendary'
  }
];


export const getAccoladesByCategory = (category: AccoladeDefinition['category']) => {
  return ACCOLADES.filter(accolade => accolade.category === category);
};

export const getAccoladeById = (id: number) => {
  return ACCOLADES.find(accolade => accolade.id === id);
};

export const RARITY_COLORS = {
  common: '#9CA3AF',     // Gray
  uncommon: '#22C55E',   // Green
  rare: '#3B82F6',       // Blue
  epic: '#A855F7',       // Purple
  legendary: '#F59E0B'   // Orange/Gold
};

export const CATEGORY_NAMES = {
  pioneer: 'Pioneer',
  funding: 'Funding',
  social: 'Social',
  creator: 'Creator',
  elite: 'Elite',
  streak: 'Streak'
};