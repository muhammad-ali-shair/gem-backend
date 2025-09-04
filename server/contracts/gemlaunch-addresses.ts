// Real Gemlaunch contract addresses on BSC Mainnet (Chain ID: 56)
export const GEMLAUNCH_CONTRACTS = {
  // Core Launchpad Contracts
  FAIR_LAUNCH: "0x63fddF231BA74CEaA3D061b67FC08af2dFbBA9DA",
  DUTCH_AUCTION: "0x120d0166b1c132Cdaa2307549568634fd3F575bd", 
  PRIVATE_SALE: "0xFA19F2Fb64Fc9cbdBA7407b573a6B82E0d6f1427",
  LAUNCHPAD: "0x8f8E2d4dd7C7dB8eA31C2b2f2B11e0A9dC5e4E0e", // Need to verify
  
  // Token Factory Contracts
  STANDARD_TOKEN_FACTORY: "0x3D61f62213EcE0917Abf64c6119D29C9dc18C427",
  BABY_TOKEN_FACTORY: "0x1234567890123456789012345678901234567890", // Need actual address
  
  // Network Info
  CHAIN_ID: 56,
  RPC_URL: "https://bsc-dataseed1.binance.org/",
  BLOCK_EXPLORER: "https://bscscan.com"
};

// Event signatures for monitoring real Gemlaunch activity
export const GEMLAUNCH_EVENTS = {
  // Fair Launch Events
  FAIR_LAUNCH_PURCHASED: "Purachsed(uint256,address,uint256)",
  FAIR_LAUNCH_LIQUIDITY_ADDED: "liquidityAdded(uint256,address,uint256)",
  FAIR_LAUNCH_PUBLIC_SALE_ENABLED: "PublicSaleEnabled(uint256,uint256)",
  
  // Dutch Auction Events  
  DUTCH_AUCTION_PURCHASED: "Purachsed(uint256,address,uint256,uint256)",
  DUTCH_AUCTION_CANCELLED: "Cancelled(uint256,uint8,uint256)",
  
  // Token Creation Events
  TOKEN_CREATED: "TokenCreated(address,address,uint8,uint256)",
  
  // Private Sale Events
  PRIVATE_SALE_PURCHASED: "Purchased(uint256,address,uint256)",
  PRIVATE_SALE_CLAIMED: "Claimed(uint256,address,uint256)"
};

// Activity type mapping for point rewards
export const ACTIVITY_MAPPING = {
  [GEMLAUNCH_EVENTS.TOKEN_CREATED]: {
    type: "token_creation",
    points: 100,
    description: "Created a new token"
  },
  [GEMLAUNCH_EVENTS.FAIR_LAUNCH_PURCHASED]: {
    type: "fair_launch",
    points: 250,
    description: "Participated in fair launch"
  },
  [GEMLAUNCH_EVENTS.DUTCH_AUCTION_PURCHASED]: {
    type: "dutch_auction", 
    points: 200,
    description: "Participated in dutch auction"
  },
  [GEMLAUNCH_EVENTS.PRIVATE_SALE_PURCHASED]: {
    type: "presale",
    points: 300,
    description: "Participated in presale"
  },
  [GEMLAUNCH_EVENTS.FAIR_LAUNCH_LIQUIDITY_ADDED]: {
    type: "volume_contribution",
    points: 1, // Per dollar equivalent
    description: "Added liquidity to fair launch"
  }
};