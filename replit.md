# Gemlaunch Rewards System

## Overview

Gemlaunch is a blockchain-based rewards platform on the BNB Chain. Its core purpose is to track user activities (like token creation, fair launches, presales, volume trading, and referrals) and award points. The system features a comprehensive leaderboard, an accolade system for achievements, and an admin dashboard for point configuration. The business vision is to incentivize and reward active participation within the Gemlaunch ecosystem, fostering community engagement and growth.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application employs a full-stack architecture with distinct frontend, backend, and database layers.

### UI/UX Decisions
- **Styling**: Tailwind CSS with shadcn/ui components, adhering to specific Gemlaunch brand colors (#0a0f0c background, #253935 form containers, #0f1713 inputs, #22cda6 accents).
- **Typography**: Uses official Gemlaunch fonts: Gilroy-Light, Gilroy-ExtraBold, and NeueMachina-Regular.
- **Layout**: Features a three-column grid, statistics cards, and a redesigned leaderboard.
- **Navigation**: Authentic Gemlaunch sidebar with official icons and a 13-item navigation structure, including dropdowns.
- **Visuals**: Uses official Gemlaunch logo, dynamic icon rendering for accolades, and transparent scrollbar styling matching the official Gempad design.
- **User Experience**: Emphasizes clear display of user points, ranks, and accolades; pagination for large user lists; and a featured projects carousel.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, built using Vite. Uses Wouter for routing, TanStack Query for state management, Radix UI primitives for UI components, React Hook Form with Zod for forms, and date-fns for date handling.
- **Backend**: Express.js server with TypeScript, utilizing RESTful endpoints with JSON responses.
- **Real-time Updates**: Implemented via native WebSocket connections using the `ws` library.
- **Data Flow**: Involves Web3 wallet connection, backend monitoring of BNB Chain for transactions, processing of smart contract events into point activities, real-time WebSocket broadcasts, aggregated leaderboard calculations, and achievement unlocking via the accolade system.
- **Anti-Sybil System**: Incorporates measures such as wallet consolidation, referral qualification requirements (e.g., $20+ investment or token/presale creation), and social media authenticity detection using Mixtral.

### Feature Specifications
- **Rewards System**: Awards points for various on-chain activities (token creation, fair launches, presales, volume trading, referrals). Point values are configurable.
- **Leaderboard**: Displays user rankings, usernames, points, and referral champions. Features a podium system for top users and pagination for full rankings.
- **Accolade System**: An achievement system with 22 distinct accolades, each with icons, unlock criteria, point rewards, and rarity levels (common, uncommon, rare, epic, legendary). Accolades are assigned based on actual user activities.
- **Referral System**: Manages referral relationships and earnings, requiring qualification for earned referrals. Includes milestone badges for successful referrals.
- **Admin Dashboard**: For managing point configurations and system settings.
- **Wallet Integration**: Supports Web3 wallet connections (e.g., MetaMask).
- **Blockchain Scanner**: Identifies real Gemlaunch users from BNB Chain by monitoring specific contract addresses (Fair Launch, Dutch Auction, Private Sale, Token Factory).
- **Social Campaigns**: Integration area prepared for Sweep Widget deployment. Replaced X API social mentions with cost-effective Sweep Widget task system. Database migrated from social_mention activities to sweep_widget_task format for mid-season launch.

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM.
- **Deployment**: Configured for Replit deployment (Node.js 20, PostgreSQL 16), with Vite for frontend build and esbuild for backend bundling. Production serving uses Express for static files and API.
- **Environment Management**: Utilizes environment variables (`DATABASE_URL`, `BNB_RPC_URL`).

## External Dependencies

- **Database**: PostgreSQL, Drizzle ORM, Neon serverless PostgreSQL.
- **Blockchain Interaction**: Web3.js.
- **UI Frameworks/Libraries**: React, Wouter, TanStack Query, Radix UI, shadcn/ui, Tailwind CSS, class-variance-authority.
- **Form Handling**: React Hook Form, Zod.
- **Date Handling**: date-fns.
- **Session Management**: connect-pg-simple.
- **Real-time Communication**: `ws` library.
- **AI/Machine Learning**: Hugging Face API (for Mixtral-8x7B).