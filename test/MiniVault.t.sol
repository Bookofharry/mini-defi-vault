// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MiniVault} from "../src/MiniVault.sol";

/// @dev Contract that tries to re-enter withdraw() when it receives ETH.
contract Attacker {
    MiniVault public vault;
    uint256 public attempts;

    constructor(MiniVault _vault) {
        vault = _vault;
    }

    function attack() external payable {
        vault.deposit{value: msg.value}();
        vault.withdraw(msg.value);
    }

    receive() external payable {
        if (attempts == 0) {
            attempts++;
            vault.withdraw(msg.value);
        }
    }
}

/// @dev Contract that rejects incoming ETH.
contract Rejector {
    MiniVault public vault;

    constructor(MiniVault _vault) {
        vault = _vault;
    }

    function depositAndWithdraw() external payable {
        vault.deposit{value: msg.value}();
        vault.withdraw(msg.value);
    }
}

contract MiniVaultTest is Test {
    MiniVault internal vault;
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    function setUp() public {
        vault = new MiniVault();
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function test_Deposit() public {
        vm.prank(alice);
        vault.deposit{value: 1 ether}();

        assertEq(vault.balances(alice), 1 ether);
        assertEq(vault.totalDeposits(), 1 ether);
        assertEq(address(vault).balance, 1 ether);
    }

    function test_DepositEmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit Deposited(alice, 1 ether);
        vm.prank(alice);
        vault.deposit{value: 1 ether}();
    }

    function test_RevertWhen_DepositZero() public {
        vm.prank(alice);
        vm.expectRevert("Deposit must be > 0");
        vault.deposit{value: 0}();
    }

    function test_Withdraw() public {
        vm.startPrank(alice);
        vault.deposit{value: 1 ether}();
        vault.withdraw(0.4 ether);
        vm.stopPrank();

        assertEq(vault.balances(alice), 0.6 ether);
        assertEq(vault.totalDeposits(), 0.6 ether);
        assertEq(alice.balance, 9.4 ether);
    }

    function test_WithdrawEmitsEvent() public {
        vm.startPrank(alice);
        vault.deposit{value: 1 ether}();
        vm.expectEmit(true, false, false, true);
        emit Withdrawn(alice, 1 ether);
        vault.withdraw(1 ether);
        vm.stopPrank();
    }

    function test_RevertWhen_WithdrawZero() public {
        vm.prank(alice);
        vm.expectRevert("Amount must be > 0");
        vault.withdraw(0);
    }

    function test_RevertWhen_WithdrawMoreThanBalance() public {
        vm.startPrank(alice);
        vault.deposit{value: 1 ether}();
        vm.expectRevert("Insufficient balance");
        vault.withdraw(2 ether);
        vm.stopPrank();
    }

    function test_BalancesAreIsolated() public {
        vm.prank(alice);
        vault.deposit{value: 2 ether}();
        vm.prank(bob);
        vault.deposit{value: 3 ether}();

        assertEq(vault.balances(alice), 2 ether);
        assertEq(vault.balances(bob), 3 ether);
        assertEq(vault.totalDeposits(), 5 ether);

        // Bob cannot withdraw Alice's funds.
        vm.prank(bob);
        vm.expectRevert("Insufficient balance");
        vault.withdraw(4 ether);
    }

    function test_RevertWhen_Reentrancy() public {
        Attacker attacker = new Attacker(vault);
        vm.deal(address(attacker), 0);
        vm.expectRevert("Transfer failed");
        attacker.attack{value: 1 ether}();
        assertEq(vault.totalDeposits(), 0);
    }

    function test_RevertWhen_ReceiverRejectsEth() public {
        Rejector rejector = new Rejector(vault);
        vm.expectRevert("Transfer failed");
        rejector.depositAndWithdraw{value: 1 ether}();
    }

    function testFuzz_DepositAndWithdraw(uint96 depositAmt, uint96 withdrawAmt) public {
        vm.assume(depositAmt > 0);
        withdrawAmt = uint96(bound(withdrawAmt, 1, depositAmt));
        vm.deal(alice, depositAmt);

        vm.startPrank(alice);
        vault.deposit{value: depositAmt}();
        vault.withdraw(withdrawAmt);
        vm.stopPrank();

        assertEq(vault.balances(alice), uint256(depositAmt) - withdrawAmt);
        assertEq(vault.totalDeposits(), uint256(depositAmt) - withdrawAmt);
        assertEq(alice.balance, withdrawAmt);
    }
}

