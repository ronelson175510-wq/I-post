const assert = require('node:assert/strict');
const { sanitizeRecentSearchQuery, dedupeRecentSearchEntries } = require('../recentSearches.js');

assert.equal(sanitizeRecentSearchQuery('   hello   world   '), 'hello world');
assert.equal(sanitizeRecentSearchQuery('  hello\n\tworld  '), 'hello world');
assert.equal(sanitizeRecentSearchQuery('    '), '');
assert.equal(sanitizeRecentSearchQuery('x'.repeat(200)), 'x'.repeat(120));

const duplicatedRecentSearches = [
  { user_id: 'u1', query: 'alice', searched_user_id: 'user-7' },
  { user_id: 'u1', query: 'alice', searched_user_id: 'user-7' },
  { user_id: 'u1', query: 'alice', searched_user_id: 'user-9' },
  { user_id: 'u1', query: 'alice', searched_user_id: 'user-7' },
  { user_id: 'u1', query: 'bob', searched_user_id: 'user-11' },
  { user_id: 'u1', query: 'bob', searched_user_id: 'user-11' },
  { user_id: 'u1', query: 'maria', searched_user_id: 'user-7' },
  { user_id: 'u1', query: 'maria', searched_user_id: 'user-7' }
];

assert.deepEqual(
  dedupeRecentSearchEntries(duplicatedRecentSearches).map((item) => item.searched_user_id),
  ['user-7', 'user-9', 'user-11']
);

console.log('recent-search sanitization tests passed');
