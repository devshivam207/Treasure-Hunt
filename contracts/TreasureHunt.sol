// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

contract TreasureHunt {
    // Constants
    uint256 private constant GRID_SIZE = 10;
    uint256 private constant TOTAL_POSITIONS = 100;
    uint256 private constant MIN_BET = 0.01 ether;
    uint256 private constant WINNER_PERCENTAGE = 90;

    // State variables
    address public owner;
    uint256 public treasurePosition;
    mapping(address => uint256) public playerPositions;
    mapping(address => bool) public activePlayers;
    address[] public playerOrder;
    uint256 public currentPlayerIndex;
    uint256 public totalPlayers;
    uint256 public gameRound;
    bool public gameActive;

    // Events
    event PlayerJoined(address player, uint256 position);
    event PlayerMoved(address player, uint256 fromPosition, uint256 toPosition, uint256 direction);
    event TreasureMoved(uint256 fromPosition, uint256 toPosition);
    event GameWon(address winner, uint256 reward);
    event InvalidMove(address player, uint256 direction);
    event NextTurn(address player);

    constructor() {
        owner = msg.sender;
        gameRound = 1;
        initializeGame();
    }

    function initializeGame() private {
        treasurePosition = uint256(keccak256(abi.encodePacked(block.number, block.timestamp))) % TOTAL_POSITIONS;
        gameActive = true;
        currentPlayerIndex = 0;
        delete playerOrder;
    }

    function startNewGame() external {
        require(msg.sender == owner, "Only owner can start a new game");
        require(!gameActive, "A game is already in progress");
        initializeGame();
    }

    function joinGame() external payable {
        require(msg.value >= MIN_BET, "Insufficient bet amount");
        require(!activePlayers[msg.sender], "Already joined");

        if (totalPlayers == 0 && !gameActive) {
            initializeGame();
        }

        uint256 initialPosition = uint256(keccak256(abi.encodePacked(msg.sender, block.number, block.timestamp))) % TOTAL_POSITIONS;
        playerPositions[msg.sender] = initialPosition;
        activePlayers[msg.sender] = true;
        playerOrder.push(msg.sender);
        totalPlayers++;

        emit PlayerJoined(msg.sender, initialPosition);
        
        if (totalPlayers == 1) {
            emit NextTurn(msg.sender);
        }
    }

    function move(uint256 direction) external {
        require(activePlayers[msg.sender], "Not an active player");
        require(playerOrder[currentPlayerIndex] == msg.sender, "Not your turn");
        require(direction < 4, "Invalid direction");

        uint256 currentPosition = playerPositions[msg.sender];
        uint256 newPosition = getNewPosition(currentPosition, direction);

        if (newPosition == currentPosition) {
            // Invalid move, emit event but don't change turn
            emit InvalidMove(msg.sender, direction);
        } else {
            playerPositions[msg.sender] = newPosition;
            emit PlayerMoved(msg.sender, currentPosition, newPosition, direction);

            moveTreasure(newPosition);

            if (newPosition == treasurePosition) {
                endGame(msg.sender);
                return;
            }

            // Move to the next player only if the move was valid
            currentPlayerIndex = (currentPlayerIndex + 1) % playerOrder.length;
            emit NextTurn(playerOrder[currentPlayerIndex]);
        }
    }

    function getNewPosition(uint256 currentPosition, uint256 direction) private pure returns (uint256) {
        if (direction == 0 && currentPosition >= GRID_SIZE) {
            return currentPosition - GRID_SIZE; // Up
        } else if (direction == 1 && currentPosition < TOTAL_POSITIONS - GRID_SIZE) {
            return currentPosition + GRID_SIZE; // Down
        } else if (direction == 2 && currentPosition % GRID_SIZE != 0) {
            return currentPosition - 1; // Left
        } else if (direction == 3 && currentPosition % GRID_SIZE != GRID_SIZE - 1) {
            return currentPosition + 1; // Right
        } else {
            return currentPosition; // If move is invalid, return current position
        }
    }

    function moveTreasure(uint256 playerPosition) private {
        uint256 oldPosition = treasurePosition;

        if (playerPosition % 5 == 0) {
            treasurePosition = getAdjacentRandomPosition(treasurePosition);
        } else if (isPrime(playerPosition)) {
            treasurePosition = uint256(keccak256(abi.encodePacked(block.number, block.timestamp))) % TOTAL_POSITIONS;
        }

        if (oldPosition != treasurePosition) {
            emit TreasureMoved(oldPosition, treasurePosition);
        }
    }

    function getAdjacentRandomPosition(uint256 position) private view returns (uint256) {
        uint256 random = uint256(keccak256(abi.encodePacked(block.number, block.timestamp))) % 4;
        uint256[] memory adjacentPositions = new uint256[](4);
        uint8 validPositions = 0;

        if (position >= GRID_SIZE) {
            adjacentPositions[validPositions++] = position - GRID_SIZE; // Up
        }
        if (position < TOTAL_POSITIONS - GRID_SIZE) {
            adjacentPositions[validPositions++] = position + GRID_SIZE; // Down
        }
        if (position % GRID_SIZE != 0) {
            adjacentPositions[validPositions++] = position - 1; // Left
        }
        if (position % GRID_SIZE != GRID_SIZE - 1) {
            adjacentPositions[validPositions++] = position + 1; // Right
        }

        return adjacentPositions[random % validPositions];
    }

    function isPrime(uint256 n) private pure returns (bool) {
        if (n <= 1) return false;
        for (uint256 i = 2; i * i <= n; i++) {
            if (n % i == 0) return false;
        }
        return true;
    }

    function endGame(address winner) private {
        uint256 reward = (address(this).balance * WINNER_PERCENTAGE) / 100;
        payable(winner).transfer(reward);
        emit GameWon(winner, reward);

        // Reset game state
        for (uint256 i = 0; i < playerOrder.length; i++) {
            address player = playerOrder[i];
            delete playerPositions[player];
            delete activePlayers[player];
        }
        delete playerOrder;
        totalPlayers = 0;
        gameActive = false;
        gameRound++;
    }

    function withdrawFees() external {
        require(msg.sender == owner, "Only owner can withdraw fees");
        require(!gameActive, "Cannot withdraw fees while game is active");

        uint256 fees = address(this).balance;
        payable(owner).transfer(fees);
    }

    function getPlayerPosition(address player) public view returns (uint256) {
        require(activePlayers[player], "Player not active");
        return playerPositions[player];
    }

    // <<<< -------   ENABLE ONLY FOR TESTING PURPOSE  ------- >>>>
    // function setTreasurePosition(uint256 position) external {
    //     require(msg.sender == owner, "Only the owner can set the treasure position");
    //     require(position < TOTAL_POSITIONS, "Position out of bounds");
    //     treasurePosition = position;
    // }

    // function setPlayerPosition(address player, uint256 position) external {
    //     require(msg.sender == owner, "Only the owner can set player positions");
    //     require(position < TOTAL_POSITIONS, "Position out of bounds");
    //     require(activePlayers[player], "Player not active");
    //     playerPositions[player] = position;
    // }
}