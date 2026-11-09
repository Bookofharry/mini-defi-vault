# Mini DeFi Vault

A full-stack decentralized application for saving Sepolia ETH in a non-custodial on-chain vault. Users connect MetaMask, deposit ETH into the `MiniVault` smart contract, track their balance and on-chain history, and withdraw at any time.

- **Live dApp:** https://mini-defi-vault-gilt.vercel.app/
- **Vault contract (Sepolia):** [`0xa1e591e04ca7968f1251ddcf5cacc09dd9e8d6a9`](https://sepolia.etherscan.io/address/0xa1e591e04ca7968f1251ddcf5cacc09dd9e8d6a9)
- **Network:** Ethereum Sepolia testnet (chain ID `11155111`)

## Features

- Connect a MetaMask wallet with automatic Sepolia network detection and switching
- Deposit and withdraw Sepolia ETH
- Live wallet balance, vault balance, total value locked and share of the vault
- On-chain activity history read from `Deposited` / `Withdrawn` events
- Transaction status feedback (pending, confirmed, failed) with Etherscan links
- Responsive interface for desktop, tablet and mobile, with light and dark themes

## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Project Structure

```
src/            MiniVault.sol smart contract
test/           Foundry tests (MiniVault.t.sol)
script/         Foundry deployment script (MiniVault.s.sol)
lib/            forge-std
app/            Next.js frontend (pages, layout, styles)
components/     Reusable UI components
utils/          Contract ABI, deployment info and the useVault hook
```

## Smart Contract

| Function | Type | Description |
| --- | --- | --- |
| `deposit()` | payable | Adds `msg.value` to the caller's balance and emits `Deposited` |
| `withdraw(uint256 amount)` | write | Sends `amount` back to the caller; reverts if it exceeds their balance |
| `balances(address)` | view | Returns a wallet's balance held in the vault |
| `totalDeposits()` | view | Returns the total ETH held by the vault |

Security: `nonReentrant` guard on `withdraw`, balances updated before ETH is transferred, and no owner or admin can move user funds.

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/MiniVault.s.sol:MiniVaultScript --rpc-url <your_rpc_url> --private-key <your_private_key> --broadcast
```

Safer alternative using an encrypted keystore:

```shell
$ cast wallet import deployer --interactive
$ forge script script/MiniVault.s.sol:MiniVaultScript --rpc-url sepolia --account deployer --broadcast
```

After deploying, update `utils/contract.json` with the new address so the frontend uses it.

### Cast

```shell
$ cast call 0xa1e591e04ca7968f1251ddcf5cacc09dd9e8d6a9 "totalDeposits()(uint256)" --rpc-url https://sepolia.gateway.tenderly.co
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

## Frontend

Built with Next.js 15, React 19 and ethers.js v6, deployed on Vercel.

```shell
$ npm install
$ npm run dev
```

Open http://localhost:3000, connect MetaMask on the Sepolia network, and deposit some test ETH.

## Author

Built by [Bookofharry](https://github.com/Bookofharry) for the Full Stack dApp assignment.
