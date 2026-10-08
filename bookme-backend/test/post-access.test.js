const assert = require('node:assert/strict');
const { normalizePostAccessSettings, canUserViewPost, canUserCommentOnPost } = require('../postAccess.js');

assert.deepEqual(normalizePostAccessSettings({
  followers_only: '1',
  comments_disabled: '0',
  followers_comments_only: '1'
}), {
  followersOnly: true,
  commentsDisabled: false,
  followersCommentsOnly: true
});

assert.equal(canUserViewPost({ followersOnly: true, user_id: 'u2' }, { user_id: 'u1', viewerUserId: 'u2' }), true);
assert.equal(canUserViewPost({ followersOnly: true, user_id: 'u2' }, { user_id: 'u1', viewerUserId: 'u3' }), false);
assert.equal(canUserCommentOnPost({ commentsDisabled: true, user_id: 'u1' }, { user_id: 'u1', viewerUserId: 'u2' }), false);
assert.equal(canUserCommentOnPost({ followersCommentsOnly: true, user_id: 'u1' }, { user_id: 'u1', viewerUserId: 'u2', isFollowing: false }), false);
assert.equal(canUserCommentOnPost({ followersCommentsOnly: true, user_id: 'u1' }, { user_id: 'u1', viewerUserId: 'u2', isFollowing: true }), true);

console.log('post access checks passed');
