const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MiniVault", function () {
  async function setup() {
    const [user] = await ethers.getSigners();
    const vault = await ethers.deployContract("MiniVault");
    return { vault, user };
  }

  it("deposits and withdraws", async function () {
    const { vault, user } = await setup();
    await vault.deposit({ value: ethers.parseEther("1") });
    expect(await vault.balances(user.address)).to.equal(ethers.parseEther("1"));
    await vault.withdraw(ethers.parseEther("0.4"));
    expect(await vault.balances(user.address)).to.equal(ethers.parseEther("0.6"));
    expect(await vault.totalDeposits()).to.equal(ethers.parseEther("0.6"));
  });

  it("rejects zero deposit and overdraw", async function () {
    const { vault } = await setup();
    await expect(vault.deposit({ value: 0 })).to.be.revertedWith("Deposit must be > 0");
    await expect(vault.withdraw(1)).to.be.revertedWith("Insufficient balance");
  });
});

