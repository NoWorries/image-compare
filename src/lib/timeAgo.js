/**
 * Format a date as "time ago" when recent, otherwise short date.
 * Uses modifiedAt for recency (e.g. "Now", "5m", "2h", "Yesterday", "2d", "1w", "Oct 15").
 */
export function timeAgo(isoString, now = new Date()) {
  const date = new Date(isoString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'Now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d`;
  if (diffWeek < 4) return `${diffWeek}w`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
