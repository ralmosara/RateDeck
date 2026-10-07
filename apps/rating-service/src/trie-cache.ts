export class PrefixTrieNode {
  children: Map<string, PrefixTrieNode> = new Map();
  rateId: bigint | null = null;
  ratePerMin: import('decimal.js').Decimal | null = null;
  incrementFirst: number = 60;
  incrementNext: number = 60;
  connectionFee: import('decimal.js').Decimal | null = null;
}

export class PrefixTrie {
  root: PrefixTrieNode = new PrefixTrieNode();

  insert(
    prefix: string, 
    rateId: bigint, 
    ratePerMin: string, 
    incrementFirst: number, 
    incrementNext: number, 
    connectionFee: string
  ) {
    const { Decimal } = require('decimal.js');
    let node = this.root;
    for (const char of prefix) {
      if (!node.children.has(char)) {
        node.children.set(char, new PrefixTrieNode());
      }
      node = node.children.get(char)!;
    }
    
    // Store data at the terminal node for this prefix
    node.rateId = rateId;
    node.ratePerMin = new Decimal(ratePerMin);
    node.incrementFirst = incrementFirst;
    node.incrementNext = incrementNext;
    node.connectionFee = new Decimal(connectionFee);
  }

  findLongestMatch(destinationNumber: string): PrefixTrieNode | null {
    let node = this.root;
    let longestMatch: PrefixTrieNode | null = null;

    for (const char of destinationNumber) {
      if (node.rateId !== null) {
        longestMatch = node;
      }
      if (!node.children.has(char)) {
        break;
      }
      node = node.children.get(char)!;
    }
    
    // Check if the very last node we landed on happens to be a valid rate itself
    if (node && node.rateId !== null) {
      longestMatch = node;
    }

    return longestMatch;
  }
}
