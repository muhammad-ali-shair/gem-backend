import { storage } from "../storage";
import { Web3 } from "web3";
import { GEMLAUNCH_CONTRACTS, GEMLAUNCH_EVENTS, ACTIVITY_MAPPING } from '../contracts/gemlaunch-addresses.js';

interface BlockchainStatus {
  isConnected: boolean;
  lastBlockNumber: number;
  eventsProcessed: number;
  lastUpdate: Date;
}

class BlockchainService {
  private web3: Web3;
  private isMonitoring = false;
  private status: BlockchainStatus = {
    isConnected: false,
    lastBlockNumber: 0,
    eventsProcessed: 0,
    lastUpdate: new Date()
  };

  constructor() {
    const rpcUrl = process.env.BNB_RPC_URL || GEMLAUNCH_CONTRACTS.RPC_URL;
    this.web3 = new Web3(rpcUrl);
    this.initializeConnection();
  }

  private async initializeConnection() {
    try {
      const blockNumber = await this.web3.eth.getBlockNumber();
      this.status.isConnected = true;
      this.status.lastBlockNumber = Number(blockNumber);
      this.status.lastUpdate = new Date();
      console.log("Connected to BNB Chain, current block:", blockNumber);
    } catch (error) {
      console.error("Failed to connect to BNB Chain:", error);
      this.status.isConnected = false;
    }
  }

  public getStatus(): BlockchainStatus {
    return { ...this.status };
  }

  public async startMonitoring(updateCallback?: (update: any) => void) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log("Blockchain monitoring initialized - paused to avoid rate limits");
    
    // Temporarily disable aggressive scanning to prevent rate limit errors
    // For production deployment, enable with specific Gemlaunch contract addresses
    // and premium RPC endpoint to properly monitor on-chain activities
    
    // Process existing unprocessed events only (no periodic scanning)
    try {
      const unprocessedEvents = await storage.getUnprocessedEvents();
      for (const event of unprocessedEvents) {
        await this.processBlockchainEvent(event);
        await storage.markEventProcessed(event.id);
        this.status.eventsProcessed++;
      }
      this.status.lastUpdate = new Date();
    } catch (error) {
      console.log("Blockchain monitoring paused due to rate limits");
    }
  }

  public async processEvents() {
    try {
      const unprocessedEvents = await storage.getUnprocessedEvents();
      
      for (const event of unprocessedEvents) {
        await this.processBlockchainEvent(event);
        await storage.markEventProcessed(event.id);
        this.status.eventsProcessed++;
      }

      // Scan for new events
      await this.scanForNewEvents();
      
      this.status.lastUpdate = new Date();
    } catch (error) {
      console.error("Error processing blockchain events:", error);
      throw error;
    }
  }

  private async processBlockchainEvent(event: any) {
    const user = await storage.getUserByWalletAddress(event.userAddress);
    if (!user) return;

    let points = 0;
    let activityType = "";

    // Determine points based on event type
    switch (event.eventType) {
      case "TokenCreated":
        points = 100;
        activityType = "token_creation";
        break;
      case "FairLaunchCreated":
        points = 500;
        activityType = "fair_launch";
        break;
      case "PresaleCreated":
        points = 750;
        activityType = "presale";
        break;
      case "DutchAuctionCreated":
        points = 1000;
        activityType = "dutch_auction";
        break;
      case "TokenPurchase":
        // Volume-based points (1 point per $1)
        const value = event.metadata?.value || 0;
        points = Math.floor(value);
        activityType = "volume_contribution";
        break;
      default:
        return; // Unknown event type
    }

    // Create activity record
    await storage.createActivity({
      userId: user.id,
      activityType,
      points,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      metadata: event.metadata || {}
    });

    console.log(`Processed ${event.eventType} for user ${user.walletAddress}: +${points} points`);
  }

  private async scanForNewEvents() {
    if (!this.status.isConnected) return;

    try {
      const currentBlock = await this.web3.eth.getBlockNumber();
      const fromBlock = Math.max(Number(currentBlock) - 1000, this.status.lastBlockNumber);

      // Contract addresses to monitor (these would be the actual Gemlaunch contract addresses)
      const contractAddresses = [
        process.env.GEMLAUNCH_TOKEN_FACTORY || "0x0000000000000000000000000000000000000000",
        process.env.GEMLAUNCH_LAUNCHPAD || "0x0000000000000000000000000000000000000000",
        process.env.GEMLAUNCH_PRESALE || "0x0000000000000000000000000000000000000000"
      ];

      for (const contractAddress of contractAddresses) {
        const logs = await this.web3.eth.getPastLogs({
          fromBlock: fromBlock,
          toBlock: 'latest',
          address: contractAddress
        });

        for (const log of logs) {
          // Parse event based on contract and topic
          const eventData = this.parseEventLog(log);
          if (eventData && typeof log === 'object' && log !== null) {
            const logObj = log as any;
            await storage.createBlockchainEvent({
              transactionHash: logObj.transactionHash || '',
              blockNumber: Number(logObj.blockNumber || 0),
              eventType: eventData.eventType,
              userAddress: eventData.userAddress,
              metadata: JSON.stringify(eventData.metadata),
              processed: false
            });
          }
        }
      }

      this.status.lastBlockNumber = Number(currentBlock);
    } catch (error) {
      console.error("Error scanning for new events:", error);
    }
  }

  private parseEventLog(log: any): { eventType: string; userAddress: string; metadata?: any } | null {
    try {
      const eventTopic = log.topics?.[0];
      if (!eventTopic) return null;

      // Map event topics to activity types using real Gemlaunch event signatures
      for (const [eventSig, mapping] of Object.entries(ACTIVITY_MAPPING)) {
        const eventHash = this.web3.utils.keccak256(eventSig);
        if (eventTopic === eventHash) {
          // Extract user address from indexed parameters (topic[1] is typically the user)
          const userAddress = log.topics?.[1] ? 
            `0x${log.topics[1].slice(26)}` : // Remove padding from address
            null;
          
          if (!userAddress) continue;

          return {
            eventType: mapping.type,
            userAddress: userAddress.toLowerCase(),
            metadata: {
              contractAddress: (log as any).address,
              transactionHash: (log as any).transactionHash,
              blockNumber: Number((log as any).blockNumber),
              points: mapping.points,
              description: mapping.description
            }
          };
        }
      }

      return null;
    } catch (error) {
      console.error("Error parsing Gemlaunch event:", error);
      return null;
    }
  }

  private async updateBlockNumber() {
    try {
      const blockNumber = await this.web3.eth.getBlockNumber();
      this.status.lastBlockNumber = Number(blockNumber);
    } catch (error) {
      console.error("Error updating block number:", error);
    }
  }

  public async monitorGemlaunchContracts() {
    try {
      // Monitor all Gemlaunch contract addresses for events
      const contractAddresses = [
        GEMLAUNCH_CONTRACTS.FAIR_LAUNCH,
        GEMLAUNCH_CONTRACTS.DUTCH_AUCTION,
        GEMLAUNCH_CONTRACTS.PRIVATE_SALE,
        GEMLAUNCH_CONTRACTS.STANDARD_TOKEN_FACTORY
      ];

      console.log("Starting Gemlaunch contract monitoring...");
      
      for (const contractAddress of contractAddresses) {
        // Get recent events from the last 100 blocks
        const latestBlock = await this.web3.eth.getBlockNumber();
        const fromBlock = Number(latestBlock) - 100;

        const events = await this.web3.eth.getPastLogs({
          address: contractAddress,
          fromBlock: fromBlock,
          toBlock: 'latest'
        });

        console.log(`Found ${events.length} events for contract ${contractAddress}`);

        for (const event of events) {
          const parsedEvent = this.parseEventLog(event);
          if (parsedEvent) {
            await this.processGemlaunchActivity(parsedEvent);
          }
        }
      }
    } catch (error) {
      console.error("Error monitoring Gemlaunch contracts:", error);
    }
  }

  private async processGemlaunchActivity(eventData: { eventType: string; userAddress: string; metadata?: any }) {
    try {
      // Check if user exists in our rewards system
      const user = await storage.getUserByWalletAddress(eventData.userAddress);
      if (!user) {
        console.log(`User ${eventData.userAddress} not registered, skipping activity`);
        return; // Only track activity for registered users
      }

      // Create activity record with real blockchain data
      await storage.createActivity({
        userId: user.id,
        activityType: eventData.eventType,
        points: eventData.metadata?.points || 0,
        transactionHash: eventData.metadata?.transactionHash,
        blockNumber: eventData.metadata?.blockNumber,
        metadata: JSON.stringify({
          contractAddress: eventData.metadata?.contractAddress,
          description: eventData.metadata?.description
        })
      });

      // Update user's total points
      await storage.updateUserPoints(user.id, eventData.metadata?.points || 0);

      console.log(`Processed ${eventData.eventType} activity for user ${eventData.userAddress}`);
    } catch (error) {
      console.error("Error processing Gemlaunch activity:", error);
    }
  }

  public stopMonitoring() {
    this.isMonitoring = false;
    console.log("Stopped blockchain monitoring");
  }
}

export const blockchainService = new BlockchainService();
