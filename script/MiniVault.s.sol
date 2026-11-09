// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MiniVault} from "../src/MiniVault.sol";

/// @notice Deploys MiniVault.
/// forge script script/MiniVault.s.sol:MiniVaultScript --rpc-url sepolia --account <keystore-name> --broadcast
contract MiniVaultScript is Script {
    function run() external returns (MiniVault vault) {
        vm.startBroadcast();
        vault = new MiniVault();
        vm.stopBroadcast();
        console.log("MiniVault deployed at:", address(vault));
    }
}

