# Mini DeFi Vault

Next.js + ethers v6 frontend and a Solidity `MiniVault` contract (Hardhat) on Sepolia.

## Setup
1. `npm install`
2. `npm test` – runs contract tests locally
3. Copy `.env.example` to `.env`, fill in your Sepolia RPC URL and a **test-only** wallet private key
4. `npm run deploy:sepolia` – deploys and writes the address to `lib/contract.json`
5. `npm run dev` – open http://localhost:3000

## Deploy
Push to GitHub, import the repo in Vercel (no env vars needed), deploy.

