class Web3Service {
  private account: string | null = null;
  
  constructor() {
    // For development, we'll simulate a wallet connection
    this.initializeSimulatedWallet();
  }

  private initializeSimulatedWallet() {
    // Simulate a connected wallet for development
    this.account = "0x2d9b878DD5f779aF723a430F8d56f21dAc847592";
  }

  async connectWallet(): Promise<string | null> {
    try {
      // In a real implementation, this would connect to MetaMask or other Web3 wallets
      // For development, we simulate the connection
      if (!this.account) {
        this.account = "0x2d9b878DD5f779aF723a430F8d56f21dAc847592";
      }
      
      console.log("Simulated wallet connected:",     this.account);
      return this.account;
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      return null;
    }
  }

  getAccount(): string | null {
    return this.account;
  }

  disconnect(): void {
    this.account = null;
  }

  isConnected(): boolean {
    return this.account !== null;
  }

  // Simulate wallet address validation
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

export const web3Service = new Web3Service();