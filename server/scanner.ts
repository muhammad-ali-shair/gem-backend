import Web3 from 'web3';
import { GEMLAUNCH_CONTRACTS, GEMLAUNCH_EVENTS } from './contracts/gemlaunch-addresses';
import { storage } from './storage';

interface OnChainUser {
  address: string;
  transactions: number;
  totalVolume: number;
  activities: Array<{
    type: string;
    hash: string;
    blockNumber: number;
    timestamp: number;
    value: number;
  }>;
}

class GemlaunchScanner {
  private web3: Web3;
  private contractAddresses: string[];

  constructor() {
    const rpcUrl = process.env.BNB_RPC_URL || GEMLAUNCH_CONTRACTS.RPC_URL;
    this.web3 = new Web3(rpcUrl);
    
    this.contractAddresses = [
      GEMLAUNCH_CONTRACTS.FAIR_LAUNCH,
      GEMLAUNCH_CONTRACTS.DUTCH_AUCTION,
      GEMLAUNCH_CONTRACTS.PRIVATE_SALE,
      GEMLAUNCH_CONTRACTS.STANDARD_TOKEN_FACTORY
    ];
  }

  async scanHistoricalUsers(fromBlock: number = 0, toBlock: number | 'latest' = 'latest'): Promise<OnChainUser[]> {
    console.log(`Scanning BNB Chain for Gemlaunch users from block ${fromBlock} to ${toBlock}...`);
    
    const userMap = new Map<string, OnChainUser>();
    
    try {
      // Get current block number if toBlock is 'latest'  
      const currentBlock = toBlock === 'latest' ? await this.web3.eth.getBlockNumber() : toBlock;
      const endBlock = Number(currentBlock);
      
      // Limit scan range to avoid rate limits - use much smaller range
      const maxBlockRange = 100;
      const actualFromBlock = Math.max(fromBlock, endBlock - maxBlockRange);
      
      console.log(`Adjusted scan range: blocks ${actualFromBlock} to ${endBlock} (${endBlock - actualFromBlock} blocks)`);
      
      // For each contract, scan for transaction history
      for (const contractAddress of this.contractAddresses) {
        try {
          console.log(`Scanning contract: ${contractAddress}`);
          
          // Get recent transactions to this contract with smaller range
          const logs = await this.web3.eth.getPastLogs({
            fromBlock: actualFromBlock,
            toBlock: endBlock,
            address: contractAddress
          });

          console.log(`Found ${logs.length} events for contract ${contractAddress.substring(0, 8)}...`);
          
          for (const log of logs) {
            await this.processLog(log, userMap);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (contractError) {
          console.warn(`Skipping contract ${contractAddress}: ${contractError.message}`);
          continue;
        }
      }
      
      const users = Array.from(userMap.values())
        .filter(user => user.transactions > 0)
        .sort((a, b) => b.totalVolume - a.totalVolume);
      
      console.log(`Found ${users.length} unique Gemlaunch users on-chain`);
      return users;
      
    } catch (error) {
      console.error('Error scanning blockchain:', error.message);
      return [];
    }
  }

  private async scanBlockRange(fromBlock: number, toBlock: number, userMap: Map<string, OnChainUser>) {
    for (const contractAddress of this.contractAddresses) {
      try {
        // Get all logs for this contract in the block range
        const logs = await this.web3.eth.getPastLogs({
          fromBlock,
          toBlock,
          address: contractAddress
        });

        for (const log of logs) {
          await this.processLog(log, userMap);
        }
      } catch (error) {
        // Skip invalid contract addresses or network errors
        console.warn(`⚠️ Skipping contract ${contractAddress}:`, error.message);
        continue;
      }
    }
  }

  private async processLog(log: any, userMap: Map<string, OnChainUser>) {
    try {
      // Get transaction details
      const tx = await this.web3.eth.getTransaction(log.transactionHash);
      if (!tx) return;

      const userAddress = tx.from.toLowerCase();
      const value = Number(this.web3.utils.fromWei(tx.value || '0', 'ether'));

      // Initialize user if not exists
      if (!userMap.has(userAddress)) {
        userMap.set(userAddress, {
          address: userAddress,
          transactions: 0,
          totalVolume: 0,
          activities: []
        });
      }

      const user = userMap.get(userAddress)!;
      
      // Determine activity type based on contract and method
      const activityType = this.determineActivityType(log.address, tx.input);
      
      user.transactions++;
      user.totalVolume += value;
      user.activities.push({
        type: activityType,
        hash: log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp: Date.now(), // Use current timestamp as fallback
        value
      });

    } catch (error) {
      // Skip problematic transactions
      console.warn(`Error processing log ${log.transactionHash}:`, error.message);
    }
  }

  private determineActivityType(contractAddress: string, inputData: string): string {
    const contract = contractAddress.toLowerCase();
    
    if (contract === GEMLAUNCH_CONTRACTS.FAIR_LAUNCH.toLowerCase()) {
      return 'fair_launch';
    } else if (contract === GEMLAUNCH_CONTRACTS.DUTCH_AUCTION.toLowerCase()) {
      return 'dutch_auction';
    } else if (contract === GEMLAUNCH_CONTRACTS.PRIVATE_SALE.toLowerCase()) {
      return 'presale';
    } else if (contract === GEMLAUNCH_CONTRACTS.STANDARD_TOKEN_FACTORY.toLowerCase()) {
      return 'token_creation';
    }
    
    return 'volume_contribution';
  }

  async importUsersToDatabase(users: OnChainUser[]): Promise<void> {
    console.log(`💾 Importing ${users.length} on-chain users to database...`);
    
    for (const onChainUser of users) {
      try {
        // Check if user already exists
        const existingUser = await storage.getUserByWalletAddress(onChainUser.address);
        
        if (!existingUser) {
          // Create new user
          const newUser = await storage.createUser({
            walletAddress: onChainUser.address,
            username: null,
            totalPoints: 0,
            referralCode: null,
            referredBy: null
          });

          console.log(`➕ Created user: ${onChainUser.address}`);

          // Add activities and calculate points
          for (const activity of onChainUser.activities) {
            const points = this.calculatePoints(activity.type, activity.value);
            
            await storage.createActivity({
              userId: newUser.id,
              activityType: activity.type,
              points,
              transactionHash: activity.hash,
              blockNumber: activity.blockNumber,
              metadata: {
                value: activity.value,
                timestamp: activity.timestamp,
                onChainImport: true
              }
            });

            // Update user points
            await storage.updateUserPoints(newUser.id, points);
          }

          console.log(`✅ Imported ${onChainUser.activities.length} activities for ${onChainUser.address}`);
        } else {
          console.log(`⏭️ User ${onChainUser.address} already exists, skipping`);
        }
      } catch (error) {
        console.error(`❌ Error importing user ${onChainUser.address}:`, error);
      }
    }
  }

  private calculatePoints(activityType: string, value: number): number {
    switch (activityType) {
      case 'token_creation':
        return 100;
      case 'fair_launch':
        return 250;
      case 'dutch_auction':
        return 200;
      case 'presale':
        return 300;
      case 'volume_contribution':
        return Math.floor(value * 100); // 1 point per 0.01 BNB
      default:
        return 10;
    }
  }
}

export const gemlaunchScanner = new GemlaunchScanner();