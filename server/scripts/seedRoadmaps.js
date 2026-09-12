require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

const BLIND_75 = {
  title: 'Blind 75',
  slug: 'blind-75',
  description: 'The definitive list of 75 essential LeetCode problems covering core data structures and patterns.',
  category: 'Curated Classics',
  problems: [
    // ── Array & Hashing ──────────────────────────────────────────────────────
    { title: 'Two Sum', platform: 'LeetCode', problemId: 'two-sum', difficulty: 'Easy', tags: ['Array', 'Hash Table'], category: 'Array & Hashing', order: 1 },
    { title: 'Contains Duplicate', platform: 'LeetCode', problemId: 'contains-duplicate', difficulty: 'Easy', tags: ['Array', 'Hash Table'], category: 'Array & Hashing', order: 2 },
    { title: 'Valid Anagram', platform: 'LeetCode', problemId: 'valid-anagram', difficulty: 'Easy', tags: ['Hash Table', 'String'], category: 'Array & Hashing', order: 3 },
    { title: 'Group Anagrams', platform: 'LeetCode', problemId: 'group-anagrams', difficulty: 'Medium', tags: ['Array', 'Hash Table', 'String'], category: 'Array & Hashing', order: 4 },
    { title: 'Top K Frequent Elements', platform: 'LeetCode', problemId: 'top-k-frequent-elements', difficulty: 'Medium', tags: ['Array', 'Hash Table', 'Heap'], category: 'Array & Hashing', order: 5 },
    { title: 'Product of Array Except Self', platform: 'LeetCode', problemId: 'product-of-array-except-self', difficulty: 'Medium', tags: ['Array', 'Prefix Sum'], category: 'Array & Hashing', order: 6 },
    { title: 'Encode and Decode Strings', platform: 'LeetCode', problemId: 'encode-and-decode-strings', difficulty: 'Medium', tags: ['Array', 'String'], category: 'Array & Hashing', order: 7 },
    { title: 'Longest Consecutive Sequence', platform: 'LeetCode', problemId: 'longest-consecutive-sequence', difficulty: 'Medium', tags: ['Array', 'Hash Table'], category: 'Array & Hashing', order: 8 },

    // ── Two Pointers ─────────────────────────────────────────────────────────
    { title: 'Valid Palindrome', platform: 'LeetCode', problemId: 'valid-palindrome', difficulty: 'Easy', tags: ['Two Pointers', 'String'], category: 'Two Pointers', order: 9 },
    { title: '3Sum', platform: 'LeetCode', problemId: '3sum', difficulty: 'Medium', tags: ['Array', 'Two Pointers', 'Sorting'], category: 'Two Pointers', order: 10 },
    { title: 'Container With Most Water', platform: 'LeetCode', problemId: 'container-with-most-water', difficulty: 'Medium', tags: ['Array', 'Two Pointers', 'Greedy'], category: 'Two Pointers', order: 11 },

    // ── Sliding Window ───────────────────────────────────────────────────────
    { title: 'Best Time to Buy and Sell Stock', platform: 'LeetCode', problemId: 'best-time-to-buy-and-sell-stock', difficulty: 'Easy', tags: ['Array', 'Dynamic Programming'], category: 'Sliding Window', order: 12 },
    { title: 'Longest Substring Without Repeating Characters', platform: 'LeetCode', problemId: 'longest-substring-without-repeating-characters', difficulty: 'Medium', tags: ['Hash Table', 'Sliding Window', 'String'], category: 'Sliding Window', order: 13 },
    { title: 'Longest Repeating Character Replacement', platform: 'LeetCode', problemId: 'longest-repeating-character-replacement', difficulty: 'Medium', tags: ['Hash Table', 'String', 'Sliding Window'], category: 'Sliding Window', order: 14 },
    { title: 'Minimum Window Substring', platform: 'LeetCode', problemId: 'minimum-window-substring', difficulty: 'Hard', tags: ['Hash Table', 'String', 'Sliding Window'], category: 'Sliding Window', order: 15 },

    // ── Stack ────────────────────────────────────────────────────────────────
    { title: 'Valid Parentheses', platform: 'LeetCode', problemId: 'valid-parentheses', difficulty: 'Easy', tags: ['String', 'Stack'], category: 'Stack', order: 16 },

    // ── Binary Search ────────────────────────────────────────────────────────
    { title: 'Search in Rotated Sorted Array', platform: 'LeetCode', problemId: 'search-in-rotated-sorted-array', difficulty: 'Medium', tags: ['Array', 'Binary Search'], category: 'Binary Search', order: 17 },
    { title: 'Find Minimum in Rotated Sorted Array', platform: 'LeetCode', problemId: 'find-minimum-in-rotated-sorted-array', difficulty: 'Medium', tags: ['Array', 'Binary Search'], category: 'Binary Search', order: 18 },

    // ── Linked List ──────────────────────────────────────────────────────────
    { title: 'Reverse Linked List', platform: 'LeetCode', problemId: 'reverse-linked-list', difficulty: 'Easy', tags: ['Linked List'], category: 'Linked List', order: 19 },
    { title: 'Merge Two Sorted Lists', platform: 'LeetCode', problemId: 'merge-two-sorted-lists', difficulty: 'Easy', tags: ['Linked List', 'Recursion'], category: 'Linked List', order: 20 },
    { title: 'Linked List Cycle', platform: 'LeetCode', problemId: 'linked-list-cycle', difficulty: 'Easy', tags: ['Hash Table', 'Linked List'], category: 'Linked List', order: 21 },
    { title: 'Reorder List', platform: 'LeetCode', problemId: 'reorder-list', difficulty: 'Medium', tags: ['Linked List', 'Two Pointers'], category: 'Linked List', order: 22 },
    { title: 'Remove Nth Node From End of List', platform: 'LeetCode', problemId: 'remove-nth-node-from-end-of-list', difficulty: 'Medium', tags: ['Linked List', 'Two Pointers'], category: 'Linked List', order: 23 },
    { title: 'Merge k Sorted Lists', platform: 'LeetCode', problemId: 'merge-k-sorted-lists', difficulty: 'Hard', tags: ['Linked List', 'Heap (Priority Queue)'], category: 'Linked List', order: 24 },

    // ── Trees ────────────────────────────────────────────────────────────────
    { title: 'Invert Binary Tree', platform: 'LeetCode', problemId: 'invert-binary-tree', difficulty: 'Easy', tags: ['Tree', 'Depth-First Search'], category: 'Trees', order: 25 },
    { title: 'Maximum Depth of Binary Tree', platform: 'LeetCode', problemId: 'maximum-depth-of-binary-tree', difficulty: 'Easy', tags: ['Tree', 'Depth-First Search'], category: 'Trees', order: 26 },
    { title: 'Same Tree', platform: 'LeetCode', problemId: 'same-tree', difficulty: 'Easy', tags: ['Tree', 'Depth-First Search'], category: 'Trees', order: 27 },
    { title: 'Subtree of Another Tree', platform: 'LeetCode', problemId: 'subtree-of-another-tree', difficulty: 'Easy', tags: ['Tree', 'Depth-First Search'], category: 'Trees', order: 28 },
    { title: 'Lowest Common Ancestor of a Binary Search Tree', platform: 'LeetCode', problemId: 'lowest-common-ancestor-of-a-binary-search-tree', difficulty: 'Medium', tags: ['Tree', 'Binary Search Tree'], category: 'Trees', order: 29 },
    { title: 'Binary Tree Level Order Traversal', platform: 'LeetCode', problemId: 'binary-tree-level-order-traversal', difficulty: 'Medium', tags: ['Tree', 'Breadth-First Search'], category: 'Trees', order: 30 },
    { title: 'Validate Binary Search Tree', platform: 'LeetCode', problemId: 'validate-binary-search-tree', difficulty: 'Medium', tags: ['Tree', 'Depth-First Search'], category: 'Trees', order: 31 },
    { title: 'Kth Smallest Element in a BST', platform: 'LeetCode', problemId: 'kth-smallest-element-in-a-bst', difficulty: 'Medium', tags: ['Tree', 'Binary Search Tree'], category: 'Trees', order: 32 },
    { title: 'Construct Binary Tree from Preorder and Inorder Traversal', platform: 'LeetCode', problemId: 'construct-binary-tree-from-preorder-and-inorder-traversal', difficulty: 'Medium', tags: ['Tree', 'Array'], category: 'Trees', order: 33 },
    { title: 'Binary Tree Maximum Path Sum', platform: 'LeetCode', problemId: 'binary-tree-maximum-path-sum', difficulty: 'Hard', tags: ['Tree', 'Depth-First Search'], category: 'Trees', order: 34 },
    { title: 'Serialize and Deserialize Binary Tree', platform: 'LeetCode', problemId: 'serialize-and-deserialize-binary-tree', difficulty: 'Hard', tags: ['Tree', 'Design'], category: 'Trees', order: 35 },

    // ── Tries ────────────────────────────────────────────────────────────────
    { title: 'Implement Trie (Prefix Tree)', platform: 'LeetCode', problemId: 'implement-trie-prefix-tree', difficulty: 'Medium', tags: ['Trie', 'Design'], category: 'Tries', order: 36 },
    { title: 'Design Add and Search Words Data Structure', platform: 'LeetCode', problemId: 'design-add-and-search-words-data-structure', difficulty: 'Medium', tags: ['Trie', 'String'], category: 'Tries', order: 37 },
    { title: 'Word Search II', platform: 'LeetCode', problemId: 'word-search-ii', difficulty: 'Hard', tags: ['Trie', 'Backtracking'], category: 'Tries', order: 38 },

    // ── Heap / Priority Queue ────────────────────────────────────────────────
    { title: 'Find Median from Data Stream', platform: 'LeetCode', problemId: 'find-median-from-data-stream', difficulty: 'Hard', tags: ['Heap', 'Design'], category: 'Heap / Priority Queue', order: 39 },

    // ── Backtracking ─────────────────────────────────────────────────────────
    { title: 'Combination Sum', platform: 'LeetCode', problemId: 'combination-sum', difficulty: 'Medium', tags: ['Array', 'Backtracking'], category: 'Backtracking', order: 40 },
    { title: 'Word Search', platform: 'LeetCode', problemId: 'word-search', difficulty: 'Medium', tags: ['Array', 'Backtracking', 'Matrix'], category: 'Backtracking', order: 41 },

    // ── Graphs ───────────────────────────────────────────────────────────────
    { title: 'Number of Islands', platform: 'LeetCode', problemId: 'number-of-islands', difficulty: 'Medium', tags: ['Array', 'Depth-First Search', 'Graph'], category: 'Graphs', order: 42 },
    { title: 'Clone Graph', platform: 'LeetCode', problemId: 'clone-graph', difficulty: 'Medium', tags: ['Graph', 'Depth-First Search'], category: 'Graphs', order: 43 },
    { title: 'Pacific Atlantic Water Flow', platform: 'LeetCode', problemId: 'pacific-atlantic-water-flow', difficulty: 'Medium', tags: ['Array', 'Depth-First Search'], category: 'Graphs', order: 44 },
    { title: 'Course Schedule', platform: 'LeetCode', problemId: 'course-schedule', difficulty: 'Medium', tags: ['Graph', 'Topological Sort'], category: 'Graphs', order: 45 },
    { title: 'Number of Connected Components in an Undirected Graph', platform: 'LeetCode', problemId: 'number-of-connected-components-in-an-undirected-graph', difficulty: 'Medium', tags: ['Graph', 'Union Find'], category: 'Graphs', order: 46 },
    { title: 'Graph Valid Tree', platform: 'LeetCode', problemId: 'graph-valid-tree', difficulty: 'Medium', tags: ['Graph', 'Depth-First Search'], category: 'Graphs', order: 47 },
    { title: 'Alien Dictionary', platform: 'LeetCode', problemId: 'alien-dictionary', difficulty: 'Hard', tags: ['Graph', 'Topological Sort'], category: 'Graphs', order: 48 },

    // ── Advanced Graphs & Intervals ──────────────────────────────────────────
    { title: 'Insert Interval', platform: 'LeetCode', problemId: 'insert-interval', difficulty: 'Medium', tags: ['Array'], category: 'Intervals', order: 49 },
    { title: 'Merge Intervals', platform: 'LeetCode', problemId: 'merge-intervals', difficulty: 'Medium', tags: ['Array', 'Sorting'], category: 'Intervals', order: 50 },
    { title: 'Non-overlapping Intervals', platform: 'LeetCode', problemId: 'non-overlapping-intervals', difficulty: 'Medium', tags: ['Array', 'Greedy'], category: 'Intervals', order: 51 },
    { title: 'Meeting Rooms', platform: 'LeetCode', problemId: 'meeting-rooms', difficulty: 'Easy', tags: ['Array', 'Sorting'], category: 'Intervals', order: 52 },
    { title: 'Meeting Rooms II', platform: 'LeetCode', problemId: 'meeting-rooms-ii', difficulty: 'Medium', tags: ['Array', 'Sorting', 'Heap'], category: 'Intervals', order: 53 },

    // ── Dynamic Programming ──────────────────────────────────────────────────
    { title: 'Climbing Stairs', platform: 'LeetCode', problemId: 'climbing-stairs', difficulty: 'Easy', tags: ['Math', 'Dynamic Programming'], category: 'Dynamic Programming', order: 54 },
    { title: 'Coin Change', platform: 'LeetCode', problemId: 'coin-change', difficulty: 'Medium', tags: ['Array', 'Dynamic Programming'], category: 'Dynamic Programming', order: 55 },
    { title: 'Longest Increasing Subsequence', platform: 'LeetCode', problemId: 'longest-increasing-subsequence', difficulty: 'Medium', tags: ['Array', 'Dynamic Programming'], category: 'Dynamic Programming', order: 56 },
    { title: 'Longest Common Subsequence', platform: 'LeetCode', problemId: 'longest-common-subsequence', difficulty: 'Medium', tags: ['String', 'Dynamic Programming'], category: 'Dynamic Programming', order: 57 },
    { title: 'Word Break', platform: 'LeetCode', problemId: 'word-break', difficulty: 'Medium', tags: ['Hash Table', 'String', 'Dynamic Programming'], category: 'Dynamic Programming', order: 58 },
    { title: 'Combination Sum IV', platform: 'LeetCode', problemId: 'combination-sum-iv', difficulty: 'Medium', tags: ['Array', 'Dynamic Programming'], category: 'Dynamic Programming', order: 59 },
    { title: 'House Robber', platform: 'LeetCode', problemId: 'house-robber', difficulty: 'Medium', tags: ['Array', 'Dynamic Programming'], category: 'Dynamic Programming', order: 60 },
    { title: 'House Robber II', platform: 'LeetCode', problemId: 'house-robber-ii', difficulty: 'Medium', tags: ['Array', 'Dynamic Programming'], category: 'Dynamic Programming', order: 61 },
    { title: 'Decode Ways', platform: 'LeetCode', problemId: 'decode-ways', difficulty: 'Medium', tags: ['String', 'Dynamic Programming'], category: 'Dynamic Programming', order: 62 },
    { title: 'Unique Paths', platform: 'LeetCode', problemId: 'unique-paths', difficulty: 'Medium', tags: ['Dynamic Programming', 'Combinatorics'], category: 'Dynamic Programming', order: 63 },
    { title: 'Jump Game', platform: 'LeetCode', problemId: 'jump-game', difficulty: 'Medium', tags: ['Array', 'Dynamic Programming', 'Greedy'], category: 'Dynamic Programming', order: 64 },

    // ── 2D Matrix ────────────────────────────────────────────────────────────
    { title: 'Set Matrix Zeroes', platform: 'LeetCode', problemId: 'set-matrix-zeroes', difficulty: 'Medium', tags: ['Array', 'Matrix'], category: '2D Matrix', order: 65 },
    { title: 'Spiral Matrix', platform: 'LeetCode', problemId: 'spiral-matrix', difficulty: 'Medium', tags: ['Array', 'Matrix'], category: '2D Matrix', order: 66 },
    { title: 'Rotate Image', platform: 'LeetCode', problemId: 'rotate-image', difficulty: 'Medium', tags: ['Array', 'Math', 'Matrix'], category: '2D Matrix', order: 67 },

    // ── Bit Manipulation ─────────────────────────────────────────────────────
    { title: 'Sum of Two Integers', platform: 'LeetCode', problemId: 'sum-of-two-integers', difficulty: 'Medium', tags: ['Math', 'Bit Manipulation'], category: 'Bit Manipulation', order: 68 },
    { title: 'Number of 1 Bits', platform: 'LeetCode', problemId: 'number-of-1-bits', difficulty: 'Easy', tags: ['Bit Manipulation'], category: 'Bit Manipulation', order: 69 },
    { title: 'Counting Bits', platform: 'LeetCode', problemId: 'counting-bits', difficulty: 'Easy', tags: ['Dynamic Programming', 'Bit Manipulation'], category: 'Bit Manipulation', order: 70 },
    { title: 'Missing Number', platform: 'LeetCode', problemId: 'missing-number', difficulty: 'Easy', tags: ['Array', 'Bit Manipulation'], category: 'Bit Manipulation', order: 71 },
    { title: 'Reverse Bits', platform: 'LeetCode', problemId: 'reverse-bits', difficulty: 'Easy', tags: ['Bit Manipulation'], category: 'Bit Manipulation', order: 72 },

    // ── Palindromic Strings ──────────────────────────────────────────────────
    { title: 'Longest Palindromic Substring', platform: 'LeetCode', problemId: 'longest-palindromic-substring', difficulty: 'Medium', tags: ['String', 'Dynamic Programming'], category: 'Palindromic Strings', order: 73 },
    { title: 'Palindromic Substrings', platform: 'LeetCode', problemId: 'palindromic-substrings', difficulty: 'Medium', tags: ['String', 'Dynamic Programming'], category: 'Palindromic Strings', order: 74 },

    // ── Codeforces Classic ───────────────────────────────────────────────────
    { title: 'Array Splitting', platform: 'Codeforces', problemId: 'CF-1197C', difficulty: '1400', tags: ['greedy', 'sortings'], category: 'Codeforces Classics', order: 75 }
  ]
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Roadmap = require('../models/Roadmap');

    await Roadmap.updateOne(
      { slug: BLIND_75.slug },
      { $set: BLIND_75 },
      { upsert: true }
    );

    console.log(`[Seed] Seeded Roadmap: "${BLIND_75.title}" with ${BLIND_75.problems.length} problems successfully!`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seed Error:', err);
  }
}

seed();
