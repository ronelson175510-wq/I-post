function sanitizeRecentSearchQuery(value, maxLength = 120) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized.slice(0, maxLength).trim();
}

module.exports = {
  sanitizeRecentSearchQuery
};
