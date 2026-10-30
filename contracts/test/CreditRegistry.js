const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CreditRegistry", function () {
  async function deploy() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("CreditRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();
    return { registry, owner, alice, bob };
  }

  it("mints only from owner and tracks used claims", async function () {
    const { registry, alice } = await deploy();
    const claimHash = ethers.id("claim-1");
    await registry.mintCredit(alice.address, 1, 10000, claimHash);
    expect(await registry.balanceOf(alice.address, 1)).to.equal(10000n);
    expect(await registry.usedClaims(claimHash)).to.equal(true);
    await expect(
      registry.mintCredit(alice.address, 1, 10000, claimHash)
    ).to.be.revertedWith("claim already used");
  });

  it("rejects mint from non-owner", async function () {
    const { registry, alice } = await deploy();
    const claimHash = ethers.id("claim-2");
    await expect(
      registry.connect(alice).mintCredit(alice.address, 1, 1000, claimHash)
    ).to.be.reverted;
  });

  it("swaps credits atomically", async function () {
    const { registry, alice, bob } = await deploy();
    await registry.mintCredit(alice.address, 1, 50000, ethers.id("a"));
    await registry.mintCredit(bob.address, 2, 30000, ethers.id("b"));

    await registry.swap(
      alice.address,
      [1],
      [20000],
      bob.address,
      [2],
      [10000]
    );

    expect(await registry.balanceOf(alice.address, 1)).to.equal(30000n);
    expect(await registry.balanceOf(alice.address, 2)).to.equal(10000n);
    expect(await registry.balanceOf(bob.address, 1)).to.equal(20000n);
    expect(await registry.balanceOf(bob.address, 2)).to.equal(20000n);
  });
});
