function sanitizeRecentSearchQuery(value, maxLength = 120) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized.slice(0, maxLength).trim();
}

function dedupeRecentSearchEntries(entries = []) {
  const seen = new Set();

  return (Array.isArray(entries) ? entries : []).filter((entry) => {
    const item = entry || {};
    const query = sanitizeRecentSearchQuery(item.query || "");
    const matchedUserId = String(item.searched_user_id || "").trim().toLowerCase();
    const userId = String(item.user_id || "").trim();
    const cacheKey = matchedUserId
      ? `${userId}|user:${matchedUserId}`
      : `${userId}|query:${query.toLowerCase()}`;

    if (!query && !matchedUserId) {
      return false;
    }

    if (seen.has(cacheKey)) {
      return false;
    }

    seen.add(cacheKey);
    return true;
  });
}

module.exports = {
  sanitizeRecentSearchQuery,
  dedupeRecentSearchEntries
};
