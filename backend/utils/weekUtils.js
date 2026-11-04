function startOfUtcWeek(value) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date;
}

function getTaskWeekBounds(taskDate) {
  const weekStart = startOfUtcWeek(taskDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  return { weekStart, weekEnd };
}

function sortWeeksCurrentFirst(groups, now = new Date()) {
  const currentStart = startOfUtcWeek(now).getTime();
  return groups.sort((a, b) => {
    const aStart = new Date(a.weekStart).getTime();
    const bStart = new Date(b.weekStart).getTime();
    const aRank = aStart === currentStart ? 0 : aStart > currentStart ? 1 : 2;
    const bRank = bStart === currentStart ? 0 : bStart > currentStart ? 1 : 2;
    return aRank - bRank || (aRank === 2 ? bStart - aStart : aStart - bStart);
  });
}

module.exports = { startOfUtcWeek, getTaskWeekBounds, sortWeeksCurrentFirst };
