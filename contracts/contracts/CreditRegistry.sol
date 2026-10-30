// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CreditRegistry
 * @notice ERC-1155 registry for EcoMark carbon credits.
 *         Categories are token ids (land=1, energy=2, water=3, transport=4).
 *         Amounts are stored as integer units with 4 decimal places off-chain
 *         (1 credit = 10_000 base units).
 *         Only the owner (backend minter) may mint. Claim hashes prevent
 *         double-minting the same verified action. Atomic swap moves credits
 *         between two parties in a single transaction.
 */
contract CreditRegistry is ERC1155, Ownable, ReentrancyGuard {
    /// @dev claimHash => already minted
    mapping(bytes32 => bool) public usedClaims;

    event CreditMinted(
        address indexed to,
        uint256 indexed categoryId,
        uint256 amount,
        bytes32 claimHash
    );

    event CreditRetired(
        address indexed from,
        uint256 indexed categoryId,
        uint256 amount
    );

    event CreditsSwapped(
        address indexed partyA,
        address indexed partyB,
        uint256[] categoriesA,
        uint256[] amountsA,
        uint256[] categoriesB,
        uint256[] amountsB
    );

    constructor() ERC1155("https://ecomark.app/api/metadata/{id}.json") Ownable(msg.sender) {}

    /**
     * @notice Mint credits for a verified claim. Owner only.
     * @param to Recipient wallet
     * @param categoryId Token id (category)
     * @param amount Base units (scale 1e4 relative to display credits)
     * @param claimHash keccak256 of the off-chain claim id
     */
    function mintCredit(
        address to,
        uint256 categoryId,
        uint256 amount,
        bytes32 claimHash
    ) external onlyOwner nonReentrant {
        require(to != address(0), "invalid recipient");
        require(amount > 0, "amount must be > 0");
        require(categoryId > 0, "invalid category");
        require(!usedClaims[claimHash], "claim already used");

        usedClaims[claimHash] = true;
        _mint(to, categoryId, amount, "");

        emit CreditMinted(to, categoryId, amount, claimHash);
    }

    /**
     * @notice Retire (burn) credits permanently.
     */
    function retireCredit(
        address from,
        uint256 categoryId,
        uint256 amount
    ) external nonReentrant {
        require(
            from == msg.sender || isApprovedForAll(from, msg.sender) || msg.sender == owner(),
            "not authorized"
        );
        require(amount > 0, "amount must be > 0");
        _burn(from, categoryId, amount);
        emit CreditRetired(from, categoryId, amount);
    }

    /**
     * @notice Atomic barter between two parties. Callable by owner (backend)
     *         so users do not need to approve each other on-chain for the demo.
     *         partyA sends categoriesA/amountsA to partyB;
     *         partyB sends categoriesB/amountsB to partyA.
     */
    function swap(
        address partyA,
        uint256[] calldata categoriesA,
        uint256[] calldata amountsA,
        address partyB,
        uint256[] calldata categoriesB,
        uint256[] calldata amountsB
    ) external onlyOwner nonReentrant {
        require(partyA != address(0) && partyB != address(0), "invalid party");
        require(categoriesA.length == amountsA.length, "A length mismatch");
        require(categoriesB.length == amountsB.length, "B length mismatch");
        require(categoriesA.length > 0 || categoriesB.length > 0, "empty swap");

        for (uint256 i = 0; i < categoriesA.length; i++) {
            require(amountsA[i] > 0, "zero amount A");
            _safeTransferFrom(partyA, partyB, categoriesA[i], amountsA[i], "");
        }
        for (uint256 i = 0; i < categoriesB.length; i++) {
            require(amountsB[i] > 0, "zero amount B");
            _safeTransferFrom(partyB, partyA, categoriesB[i], amountsB[i], "");
        }

        emit CreditsSwapped(
            partyA,
            partyB,
            categoriesA,
            amountsA,
            categoriesB,
            amountsB
        );
    }
}
