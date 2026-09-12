const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const Problem = require('../server/models/Problem');

const REAL_LC_DIFF_MAP = {
  '132-pattern': 'Medium',
  'smallest-even-multiple': 'Easy',
  'design-circular-deque': 'Medium',
  'largest-rectangle-in-histogram': 'Hard',
  'remove-nodes-from-linked-list': 'Medium',
  'minimum-operations-to-make-binary-array-elements-equal-to-one-i': 'Medium',
  'decode-string': 'Medium',
  'longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit': 'Medium',
  'sliding-window-maximum': 'Hard',
  'subarray-sums-divisible-by-k': 'Medium',
  'minimum-value-to-get-positive-step-by-step-sum': 'Easy',
  'two-sum': 'Easy',
  'add-two-numbers': 'Medium',
  'longest-substring-without-repeating-characters': 'Medium',
  'median-of-two-sorted-arrays': 'Hard',
  'longest-palindromic-substring': 'Medium',
  'container-with-most-water': 'Medium',
  '3sum': 'Medium',
  'letter-combinations-of-a-phone-number': 'Medium',
  'remove-nth-node-from-end-of-list': 'Medium',
  'valid-parentheses': 'Easy',
  'merge-two-sorted-lists': 'Easy',
  'generate-parentheses': 'Medium',
  'merge-k-sorted-lists': 'Hard',
  'search-in-rotated-sorted-array': 'Medium',
  'search-insert-position': 'Easy',
  'combination-sum': 'Medium',
  'trapping-rain-water': 'Hard',
  'group-anagrams': 'Medium',
  'maximum-subarray': 'Medium',
  'spiral-matrix': 'Medium',
  'jump-game': 'Medium',
  'merge-intervals': 'Medium',
  'unique-paths': 'Medium',
  'climbing-stairs': 'Easy',
  'edit-distance': 'Hard',
  'set-matrix-zeroes': 'Medium',
  'sort-colors': 'Medium',
  'minimum-window-substring': 'Hard',
  'subsets': 'Medium',
  'word-search': 'Medium',
  'validate-binary-search-tree': 'Medium',
  'same-tree': 'Easy',
  'binary-tree-level-order-traversal': 'Medium',
  'maximum-depth-of-binary-tree': 'Easy',
  'best-time-to-buy-and-sell-stock': 'Easy',
  'valid-palindrome': 'Easy',
  'longest-consecutive-sequence': 'Medium',
  'single-number': 'Easy',
  'word-break': 'Medium',
  'linked-list-cycle': 'Easy',
  'lru-cache': 'Medium',
  'min-stack': 'Medium',
  'number-of-islands': 'Medium',
  'reverse-bits': 'Easy',
  'course-schedule': 'Medium',
  'invert-binary-tree': 'Easy',
  'kth-smallest-element-in-a-bst': 'Medium',
  'lowest-common-ancestor-of-a-binary-tree': 'Medium',
  'product-of-array-except-self': 'Medium',
  'valid-anagram': 'Easy',
  'missing-number': 'Easy',
  'find-the-duplicate-number': 'Medium',
  'longest-increasing-subsequence': 'Medium',
  'coin-change': 'Medium',
  'counting-bits': 'Easy',
  'top-k-frequent-elements': 'Medium',
  'subarray-sum-equals-k': 'Medium',
  'daily-temperatures': 'Medium'
};

async function fixDifficulties() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Fixing LeetCode problem difficulties in DB...');

  const problems = await Problem.find({ platform: 'LeetCode' });
  let updated = 0;

  for (const p of problems) {
    const realDiff = REAL_LC_DIFF_MAP[p.problemId];
    if (realDiff && p.difficulty !== realDiff) {
      p.difficulty = realDiff;
      await p.save();
      updated++;
    }
  }

  console.log(`Updated ${updated} LeetCode problems in DB with exact real difficulties.`);
  await mongoose.disconnect();
}

fixDifficulties().catch(console.error);
