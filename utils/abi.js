export const VAULT_ABI = [
  "function deposit() payable",
  "function withdraw(uint256 amount)",
  "function balances(address) view returns (uint256)",
  "function totalDeposits() view returns (uint256)",
  "event Deposited(address indexed user, uint256 amount)",
  "event Withdrawn(address indexed user, uint256 amount)",
];

// Public read-only RPC used before a wallet is connected.
export const READ_RPC = "https://sepolia.gateway.tenderly.co";
export const EXPLORER = "https://sepolia.etherscan.io";
