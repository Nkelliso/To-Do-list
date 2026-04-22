const DAY_NUM = { M: 1, Tu: 2, W: 3, Th: 4, F: 5 }

// Days-away → priority: today=P4, 1 day=P3, 2-3 days=P2, 4+ days=P1
const LOOKUP = [4, 3, 2, 2, 1, 1, 1]

export function getDayPriority(dayDue) {
  if (dayDue === 'Wknd') return 1
  const todayNum = new Date().getDay() // 0=Sun,1=Mon…6=Sat
  const dueNum = DAY_NUM[dayDue]
  if (!dueNum) return 1
  const daysAway = (dueNum - todayNum + 7) % 7
  return LOOKUP[Math.min(daysAway, LOOKUP.length - 1)]
}

// Effective priority: the day-based urgency can only RAISE priority, never lower it.
// The stored priority acts as a floor — auto-logic applies Math.max so a manually
// elevated priority is preserved even when the due date is pushed further out.
// P5 is always returned as-is (Critical is a manual-only designation).
export function effectivePriority(task) {
  if (!task) return 1
  if (task.priority === 5) return 5
  return Math.max(task.priority || 1, getDayPriority(task.dayDue))
}
