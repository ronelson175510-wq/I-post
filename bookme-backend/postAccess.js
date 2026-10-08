function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return Boolean(value);
}

function normalizePostAccessSettings(input = {}) {
  const values = input || {};

  return {
    followersOnly: toBoolean(values.followers_only ?? values.followersOnly ?? false),
    commentsDisabled: toBoolean(values.comments_disabled ?? values.commentsDisabled ?? false),
    followersCommentsOnly: toBoolean(values.followers_comments_only ?? values.followersCommentsOnly ?? false)
  };
}

function canUserViewPost(post = {}, options = {}) {
  const settings = normalizePostAccessSettings(post);
  const viewerUserId = options.viewerUserId ?? options.user_id ?? options.userId ?? '';
  const authorUserId = post.user_id ?? post.userId ?? '';

  if (!settings.followersOnly) return true;
  if (!viewerUserId) return false;
  if (String(viewerUserId) === String(authorUserId)) return true;

  return Boolean(options.isFollowing ?? false);
}

function canUserCommentOnPost(post = {}, options = {}) {
  const settings = normalizePostAccessSettings(post);
  const viewerUserId = options.viewerUserId ?? options.user_id ?? options.userId ?? '';
  const authorUserId = post.user_id ?? post.userId ?? '';

  if (settings.commentsDisabled) return false;
  if (!settings.followersCommentsOnly) return true;
  if (!viewerUserId) return false;
  if (String(viewerUserId) === String(authorUserId)) return true;

  return Boolean(options.isFollowing ?? false);
}

module.exports = {
  normalizePostAccessSettings,
  canUserViewPost,
  canUserCommentOnPost
};
