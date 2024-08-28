const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TreasureHunt Contract", function () {
  let TreasureHunt;
  let treasureHunt;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    TreasureHunt = await ethers.getContractFactory("TreasureHunt");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    treasureHunt = await TreasureHunt.deploy();
    await treasureHunt.deployed();
  });

  // << WORKS FINE >>
  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await treasureHunt.owner()).to.equal(owner.address);
    });

    it("Should initialize game with treasure position", async function () {
      const treasurePosition = await treasureHunt.treasurePosition();
      expect(treasurePosition).to.be.gte(0).and.lte(99);
    });

    it("Should set initial game round to 1", async function () {
      expect(await treasureHunt.gameRound()).to.equal(1);
    });
  });

  // << WORKS FINE >>
  describe("Join Game", function () {
    it("Should allow a player to join the game with sufficient bet", async function () {
      await treasureHunt
        .connect(addr1)
        .joinGame({ value: ethers.utils.parseEther("0.01") });
      expect(await treasureHunt.activePlayers(addr1.address)).to.be.true;
      expect(await treasureHunt.totalPlayers()).to.equal(1);
    });

    it("Should fail if the bet is too low", async function () {
      await expect(
        treasureHunt
          .connect(addr1)
          .joinGame({ value: ethers.utils.parseEther("0.009") })
      ).to.be.revertedWith("Insufficient bet amount");
    });

    it("Should not allow the same player to join twice", async function () {
      await treasureHunt
        .connect(addr1)
        .joinGame({ value: ethers.utils.parseEther("0.01") });
      await expect(
        treasureHunt
          .connect(addr1)
          .joinGame({ value: ethers.utils.parseEther("0.01") })
      ).to.be.revertedWith("Already joined");
    });

    it("Should emit NextTurn event for the first player", async function () {
      await expect(
        treasureHunt
          .connect(addr1)
          .joinGame({ value: ethers.utils.parseEther("0.01") })
      )
        .to.emit(treasureHunt, "NextTurn")
        .withArgs(addr1.address);
    });

    it("Should set a valid initial position for the player", async function () {
      await treasureHunt
        .connect(addr1)
        .joinGame({ value: ethers.utils.parseEther("0.01") });
      const position = await treasureHunt.getPlayerPosition(addr1.address);
      expect(position).to.be.gte(0).and.lte(99);
    });
  });

  // << WORKS FINE - EDGE CASES HANDELED IN THE CONTRACT AS WELL AS HERE >>
  describe("Movement", function () {
    beforeEach(async function () {
      await treasureHunt
        .connect(addr1)
        .joinGame({ value: ethers.utils.parseEther("0.01") });
      await treasureHunt.setPlayerPosition(addr1.address, 75);
      await treasureHunt
        .connect(addr2)
        .joinGame({ value: ethers.utils.parseEther("0.01") });
      await treasureHunt.setPlayerPosition(addr1.address, 55); // Middle of the grid
    });

    it("Should allow player to move in valid directions", async function () {
      await treasureHunt.connect(addr1).move(0); // Up
      expect(await treasureHunt.getPlayerPosition(addr1.address)).to.equal(45);

      await treasureHunt.connect(addr2).move(0); // Player 2's turn (any move)

      await treasureHunt.connect(addr1).move(1); // Down
      expect(await treasureHunt.getPlayerPosition(addr1.address)).to.equal(55);

      await treasureHunt.connect(addr2).move(1); // Player 2's turn (any move)

      await treasureHunt.connect(addr1).move(2); // Left
      expect(await treasureHunt.getPlayerPosition(addr1.address)).to.equal(54);

      await treasureHunt.connect(addr2).move(2); // Player 2's turn (any move)

      await treasureHunt.connect(addr1).move(3); // Right
      expect(await treasureHunt.getPlayerPosition(addr1.address)).to.equal(55);
    });

    it("Should emit PlayerMoved event for valid moves", async function () {
      await expect(treasureHunt.connect(addr1).move(0))
        .to.emit(treasureHunt, "PlayerMoved")
        .withArgs(addr1.address, 55, 45, 0);
    });

    it("Should emit InvalidMove event for invalid moves", async function () {
      await treasureHunt.setPlayerPosition(addr1.address, 0); // Top-left corner
      await expect(treasureHunt.connect(addr1).move(0))
        .to.emit(treasureHunt, "InvalidMove")
        .withArgs(addr1.address, 0);
    });

    it("Should not change turn on invalid move", async function () {
      await treasureHunt.setPlayerPosition(addr1.address, 0); // Top-left corner
      await treasureHunt.connect(addr1).move(0); // Invalid move
      await expect(treasureHunt.connect(addr1).move(1)) // Should still be addr1's turn
        .to.emit(treasureHunt, "PlayerMoved");
    });

    it("Should move to next player after a valid move", async function () {
      await treasureHunt.connect(addr1).move(1); // Valid move
      await expect(treasureHunt.connect(addr2).move(0)).to.emit(
        treasureHunt,
        "PlayerMoved"
      );
    });
  });
  // << WORKS FINE - Priority Order => /5 > PRIME >>
  describe("Treasure Movement", function () {
    beforeEach(async function () {
      await treasureHunt
        .connect(addr1)
        .joinGame({ value: ethers.utils.parseEther("0.01") });
    });

    it("Should move treasure if player lands on position divisible by 5", async function () {
      await treasureHunt.setPlayerPosition(addr1.address, 14);
      const oldTreasurePosition = await treasureHunt.treasurePosition();
      await treasureHunt.connect(addr1).move(3); // Move to position 15
      const newTreasurePosition = await treasureHunt.treasurePosition();
      expect(newTreasurePosition).to.not.equal(oldTreasurePosition);
    });

    it("Should move treasure to a random position if player lands on a prime number", async function () {
      await treasureHunt.setPlayerPosition(addr1.address, 10);
      const oldTreasurePosition = await treasureHunt.treasurePosition();
      await treasureHunt.connect(addr1).move(3); // Move to position 11 (prime)
      const newTreasurePosition = await treasureHunt.treasurePosition();
      expect(newTreasurePosition).to.not.equal(oldTreasurePosition);
    });
  });
  // << WORKS DEPENDING ON THE PREV GAME STATE >>
  describe("Game End", function () {
    beforeEach(async function () {
      await treasureHunt
        .connect(addr1)
        .joinGame({ value: ethers.utils.parseEther("1") });
      await treasureHunt
        .connect(addr2)
        .joinGame({ value: ethers.utils.parseEther("1") });
    });

    it("Should end game and reward winner when player finds treasure", async function () {
      const treasurePosition = await treasureHunt.treasurePosition();
      //   treasureHunt.setTreasurePosition(55);
      if (treasurePosition % 10 !== 0) {
        await treasureHunt.setPlayerPosition(
          addr1.address,
          treasurePosition - 1
        );
      } else {
        await treasureHunt.setPlayerPosition(
          addr1.address,
          treasurePosition + 1
        );
      }

      const balanceBefore = await ethers.provider.getBalance(addr1.address);
      if (treasurePosition % 10 !== 0) {
        await treasureHunt.connect(addr1).move(3); // Move to treasure position
      } else {
        await treasureHunt.connect(addr1).move(2); // Move to treasure position
      }

      const balanceAfter = await ethers.provider.getBalance(addr1.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
      expect(await treasureHunt.gameActive()).to.be.false;
      expect(await treasureHunt.totalPlayers()).to.equal(0);
    });

    it("Should emit GameWon event", async function () {
      const treasurePosition = await treasureHunt.treasurePosition();
      await treasureHunt.setPlayerPosition(addr1.address, treasurePosition - 1);

      // Calculate the expected reward
      const contractBalance = await ethers.provider.getBalance(
        treasureHunt.address
      );
      const expectedReward = contractBalance.mul(90).div(100); // 90% of the contract balance

      await expect(treasureHunt.connect(addr1).move(3))
        .to.emit(treasureHunt, "GameWon")
        .withArgs(addr1.address, expectedReward);
    });
  });
  // << WORKES FINE - PREV GAME NEED TO FINISH FIRST >>
  describe("Owner Functions", function () {
    it("Should allow owner to start a new game", async function () {
      // End the current game first
      const treasurePosition = await treasureHunt.treasurePosition();

      if (treasurePosition % 10 !== 0) {
        await treasureHunt.setPlayerPosition(
          addr1.address,
          treasurePosition - 1
        );
        await treasureHunt.connect(addr1).move(3); // Adjust direction based on position
      } else {
        await treasureHunt.setPlayerPosition(
          addr1.address,
          treasurePosition + 1
        );
        await treasureHunt.connect(addr1).move(2); // Adjust direction based on position
      }

      // Now start a new game
      await treasureHunt.connect(owner).startNewGame();

      expect(await treasureHunt.gameActive()).to.be.true;
      expect(await treasureHunt.gameRound()).to.equal(2);
    });

    it("Should allow owner to withdraw fees", async function () {
      // End the current game first
      const treasurePosition = await treasureHunt.treasurePosition();

      if (treasurePosition % 10 !== 0) {
        await treasureHunt.setPlayerPosition(
          addr1.address,
          treasurePosition - 1
        );
        await treasureHunt.connect(addr1).move(3); // Adjust direction based on position
      } else {
        await treasureHunt.setPlayerPosition(
          addr1.address,
          treasurePosition + 1
        );
        await treasureHunt.connect(addr1).move(2); // Adjust direction based on position
      }

      // Wait for the game to end
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Optional: adjust time if needed

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      await treasureHunt.connect(owner).withdrawFees();
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should not allow non-owners to withdraw fees", async function () {
      await expect(
        treasureHunt.connect(addr1).withdrawFees()
      ).to.be.revertedWith("Only owner can withdraw fees");
    });
  });
});
