const assert = require('node:assert/strict');
const { sanitizeRecentSearchQuery } = require('../recentSearches.js');

assert.equal(sanitizeRecentSearchQuery('   hello   world   '), 'hello world');
assert.equal(sanitizeRecentSearchQuery('  hello\n\tworld  '), 'hello world');
assert.equal(sanitizeRecentSearchQuery('    '), '');
assert.equal(sanitizeRecentSearchQuery('x'.repeat(200)), 'x'.repeat(120));

console.log('recent-search sanitization tests passed');
