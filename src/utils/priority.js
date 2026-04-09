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

// Use stored priority only for P5 (manual-only); everything else
// is computed live from the due day so it advances as days pass.
export function effectivePriority(task) {
  if (!task) return 1
  if (task.priority === 5) return 5
  return getDayPriority(task.dayDue)
}
