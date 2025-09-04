# Gemlaunch Rewards System - Developer Guide

## Overview

The Gemlaunch Rewards System is a comprehensive blockchain-based points and leaderboard platform that tracks user activities on BNB Chain and awards points for various actions. The system features real-time leaderboards, referral tracking, achievement accolades, and social engagement campaigns.

## System Architecture

### Database Structure (SQLite)

The system uses SQLite with the following core tables:

#### 1. Users Table
```sql
users (
  id INTEGER PRIMARY KEY,
  wallet_address TEXT UNIQUE,
  username TEXT,
  total_points INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by INTEGER,
  is_influencer BOOLEAN DEFAULT FALSE,
  is_main_account BOOLEAN DEFAULT TRUE,
  parent_user_id INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### 2. Activities Table
```sql
activities (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  activity_type TEXT, -- See ActivityType enum below
  points INTEGER,
  transaction_hash TEXT,
  block_number INTEGER,
  metadata TEXT, -- JSON string
  created_at TIMESTAMP
)
```

#### 3. Referrals Table
```sql
referrals (
  id INTEGER PRIMARY KEY,
  referrer_id INTEGER,
  referee_id INTEGER,
  points_earned INTEGER DEFAULT 0,
  is_qualified BOOLEAN DEFAULT FALSE,
  qualification_amount REAL DEFAULT 0.00,
  created_at TIMESTAMP
)
```

#### 4. Accolades Table
```sql
accolades (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  accolade_type TEXT,
  level INTEGER DEFAULT 1,
  multiplier REAL DEFAULT 0.00,
  unlocked_at TIMESTAMP
)
```

#### 5. User Wallets Table (Multi-wallet support)
```sql
user_wallets (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  wallet_address TEXT UNIQUE,
  label TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP
)
```

### Activity Types

```typescript
type ActivityType = 
  | "token_creation"        // Creating new tokens
  | "fair_launch"          // Launching fair launch campaigns
  | "presale_launch"       // Launching presales
  | "dutch_auction"        // Dutch auction participation
  | "project_funding"      // Investing in projects
  | "referral_bonus"       // Earning from referrals
  | "welcome_bonus"        // New user welcome points
  | "sweep_widget_task"    // Social media tasks (future)
  | "sweep_widget_preparation" // System preparation activities
```

## Points System

### Base Point Values
- **Token Creation**: 500 points
- **Fair Launch**: 750 points
- **Presale Launch**: 600 points
- **Dutch Auction**: 400 points
- **Project Funding**: 50-500 points (based on investment amount)
- **Referral Bonus**: 10% of referee's earned points
- **Welcome Bonus**: 100 points
- **Sweep Widget Tasks**: 100 points (configurable)

### Point Calculation Logic
1. **Base Points**: Awarded immediately upon activity completion
2. **Accolade Bonus**: Additional points from unlocked achievements
3. **Total Points**: `basePoints + accoladeBonus`

## Referral System

### How Referrals Work

1. **Referral Code Generation**: Each user gets a unique 6-character alphanumeric code
2. **Referral Link**: `https://gemlaunch.io?ref=ABC123`
3. **Qualification Requirements**: Referees must invest $20+ or create a token/presale
4. **Point Distribution**: Referrers earn 10% of referee's total points

### Anti-Sybil Protection

- **Qualification Threshold**: $20 minimum investment
- **Real Activity Tracking**: Only blockchain-verified activities count
- **Wallet Consolidation**: Multiple wallets can be linked to one account
- **Time-based Validation**: Activities must occur within reasonable timeframes

### Database Flow

```javascript
// When user uses referral code
1. Create user with referred_by field
2. Track qualification activities
3. When qualification met:
   - Set is_qualified = true
   - Calculate points_earned for referrer
   - Create referral_bonus activity
   - Update referrer's total_points
```

## Leaderboard System

### Main Leaderboard
- Ranks all users by total_points (descending)
- Includes: rank, username, wallet_address, total_points, accolade_count
- Pagination: 25 users per page
- Real-time updates via WebSocket

### Referral Leaderboard
- Ranks users by total referrals and points earned from referrals
- Includes: user info, total_referrals, total_earned, weekly/monthly stats
- Separate ranking system for referral champions

### API Endpoints

```javascript
GET /api/leaderboard?limit=25&offset=0
GET /api/referrals/leaderboard
GET /api/users/:id/rank
```

## Accolade System

### Accolade Types & Unlock Criteria

```javascript
const ACCOLADES = [
  {
    id: "gemlaunch_pioneer",
    name: "Gemlaunch Pioneer",
    description: "Early adopter of the platform",
    criteria: "Register during beta",
    pointsBonus: 100,
    rarity: "common"
  },
  {
    id: "token_creator",
    name: "Token Creator",
    description: "Created your first token",
    criteria: "Create 1+ tokens",
    pointsBonus: 200,
    rarity: "uncommon"
  },
  {
    id: "launch_master",
    name: "Launch Master", 
    description: "Successfully launched projects",
    criteria: "Complete 3+ launches",
    pointsBonus: 500,
    rarity: "rare"
  },
  {
    id: "funding_veteran",
    name: "Funding Veteran",
    description: "Seasoned investor",
    criteria: "$100+ total investment",
    pointsBonus: 300,
    rarity: "uncommon"
  },
  // ... 18 more accolades
];
```

### Accolade Unlock Logic

```javascript
// Auto-unlocks when criteria met
async function checkAccoladeUnlocks(userId) {
  const userActivities = await getUserActivities(userId);
  const userStats = calculateUserStats(userActivities);
  
  for (const accolade of ACCOLADES) {
    if (meetsUnlockCriteria(userStats, accolade.criteria)) {
      await unlockAccolade(userId, accolade.id);
    }
  }
}
```

## Blockchain Integration

### BNB Chain Monitoring

The system monitors these smart contracts:
- **Fair Launch Factory**: `0x...` (contract address)
- **Dutch Auction Factory**: `0x...`
- **Private Sale Factory**: `0x...`
- **Token Factory**: `0x...`

### Event Processing

```javascript
// Blockchain scanner identifies real users
async function processBlockchainEvent(event) {
  const user = await findOrCreateUser(event.userAddress);
  
  const activity = {
    userId: user.id,
    activityType: mapEventToActivityType(event.type),
    points: calculatePoints(event),
    transactionHash: event.txHash,
    blockNumber: event.blockNumber,
    metadata: JSON.stringify(event.data)
  };
  
  await createActivity(activity);
  await updateUserPoints(user.id);
  await checkAccoladeUnlocks(user.id);
}
```

## Real-time Features

### WebSocket Implementation

```javascript
// WebSocket broadcasts for real-time updates
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

function broadcastUpdate(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Broadcast events:
// - New activities
// - Leaderboard changes  
// - Accolade unlocks
// - Referral completions
```

### Frontend WebSocket Client

```javascript
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws`;
const socket = new WebSocket(wsUrl);

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleRealtimeUpdate(data);
};
```

## Social Campaigns (Future Implementation)

### Sweep Widget Integration

The system is prepared for Sweep Widget social campaign integration:

```javascript
// Placeholder endpoint
GET /api/social/campaigns
{
  "status": "coming_soon",
  "integrationReady": true,
  "features": {
    "xCampaigns": { "enabled": false, "maxPoints": 500 },
    "discordTasks": { "enabled": false, "maxPoints": 300 }
  }
}
```

### Migration from X API

- **Previous**: Direct X API integration with Mixtral AI analysis ($100+/month)
- **Current**: Sweep Widget integration area (cost-effective)
- **Timeline**: Mid-season deployment
- **Benefits**: Maintains social engagement without high API costs

## API Reference

### Core Endpoints

#### User Management
```javascript
POST /api/wallet/connect
GET /api/users/:walletAddress
GET /api/profile/:walletAddress
GET /api/profile/wallets/:walletAddress
```

#### Activities
```javascript
POST /api/activities
GET /api/activities/recent
GET /api/user/accolades
```

#### Leaderboards
```javascript
GET /api/leaderboard
GET /api/referrals/leaderboard
GET /api/users/:id/rank
```

#### Referrals
```javascript
GET /api/referrals/stats/:walletAddress
GET /api/referrals/recent/:walletAddress
POST /api/referrals/create
```

#### Admin
```javascript
POST /api/admin/scan-blockchain
PUT /api/admin/point-configs
POST /api/admin/fix-accolades
```

## Development Setup

### Prerequisites
- Node.js 20+
- SQLite 3
- BNB Chain RPC access

### Environment Variables
```bash
DATABASE_URL=sqlite:./database.db
BNB_RPC_URL=https://bsc-dataseed.binance.org/
SESSION_SECRET=your-secret-key
```

### Database Initialization

```javascript
// SQLite auto-creates tables on first run
const database = new Database('./database.db');

// Sample data population for development
npm run db:seed
```

### Running the Application

```bash
npm install
npm run dev  # Starts both frontend and backend
```

## Key Implementation Notes

### Data Consistency
- All point calculations happen server-side
- Activities are immutable once created
- Real-time updates maintain consistency across clients

### Performance Considerations
- Leaderboard queries are optimized with proper indexing
- WebSocket connections are managed efficiently
- Blockchain scanning runs in background with rate limiting

### Security Features
- Wallet signature verification for user authentication
- Anti-sybil protection through qualification requirements
- Server-side validation of all point awards

### Multi-wallet Support
- Users can link multiple wallet addresses
- Points are consolidated across all linked wallets
- Primary wallet designation for main profile

## Future Enhancements

1. **Sweep Widget Integration**: Social media task campaigns
2. **Advanced Analytics**: User behavior tracking and insights
3. **Seasonal Campaigns**: Time-limited point multipliers
4. **NFT Rewards**: Exclusive NFTs for top performers
5. **Cross-chain Support**: Expand beyond BNB Chain

---

## Quick Reference

### File Structure
```
server/
├── routes.ts           # Main API endpoints
├── storage.ts          # Database operations
├── scanner.ts          # Blockchain monitoring
└── services/
    └── blockchain.ts   # Web3 integration

client/src/
├── pages/
│   ├── leaderboard.tsx # Main leaderboard page
│   └── profile.tsx     # User profile page
├── components/
│   ├── activities/     # Activity components
│   ├── referrals/      # Referral components
│   └── social/         # Social campaign area
└── lib/
    ├── web3.ts         # Web3 connection handling
    └── queryClient.ts  # API client setup

shared/
├── schema.ts           # Database schema & types
└── accolades.ts        # Accolade definitions
```

### Common Tasks

#### Adding New Activity Type
1. Update `ActivityType` in `shared/schema.ts`
2. Add point configuration in database
3. Implement blockchain event handler
4. Update frontend activity display

#### Creating New Accolade
1. Add definition to `shared/accolades.ts`
2. Implement unlock criteria logic
3. Test with sample user data
4. Update frontend accolade display

This documentation provides a complete technical overview for implementing and extending the Gemlaunch Rewards System.