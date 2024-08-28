# TreasureHunt Smart Contract

## Overview

The **`TreasureHunt`** smart contract is a grid-based game where players join, move around a 10x10 grid, and attempt to find a hidden treasure. Players move in four directions (up, down, left, right) and can win rewards by locating the treasure. The contract supports starting new games, joining games, player movements, treasure movements, and determining winners.

## Contract File

The smart contract code can be found in the following path: contracts/TreasureHunt.sol


## Test Script

The test script is designed to verify the functionality of the **`TreasureHunt`** smart contract using Hardhat and Chai. The script covers various aspects of the contract including deployment, joining the game, player movements, treasure movements, game ending, and owner functions.

### Prerequisites

Ensure you have Hardhat and Chai installed in your project. You can install them using npm:
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers chai


## Running Tests

Deploy the contract and run tests with: npx hardhat test

## Test Coverage

The following scenarios are covered in the test script:

### Deployment

- Check the correct owner is set.
- Ensure the game initializes with a treasure position.
- Confirm the initial game round is set to 1.

### Join Game

- Verify a player can join with sufficient bet.
- Ensure the player's initial position is set correctly.

### Player Movement

- Test valid and invalid moves.
- Verify that moving to a position divisible by 5 or a prime number causes the treasure to move.

### Game End

- Confirm that finding the treasure ends the game and the correct reward is given.
- Ensure that the game state resets properly after the game ends.

### Owner Functions

- Verify that the owner can start a new game.
- Ensure that the owner can withdraw fees only when no game is active.


.
.
.
.

This Markdown file includes the contract path and provides an overview of the test script, prerequisites, how to run the tests, and the coverage scenarios.


