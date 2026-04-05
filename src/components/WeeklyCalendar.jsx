import { useEffect, useRef, useState } from 'react'

const TASK_DAYS = ['M', 'Tu', 'W', 'Th', 'F', 'Wknd']

const ALL_COLUMNS = [
  { key: 'M',    label: 'M',       isWeekend: false },
  { key: 'Tu',   label: 'Tu',      isWeekend: false },
  { key: 'W',    label: 'W',       isWeekend: false },
  { key: 'Th',   label: 'Th',      isWeekend: false },
  { key: 'F',    label: 'F',       isWeekend: false },
  { key: 'Wknd', label: 'Weekend', isWeekend: true  },
]

const START_HOUR = 8
const END_HOUR = 21
const TOTAL_HOURS = END_HOUR - START_HOUR
const HOUR_HEIGHT = 64
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT
const TIME_GUTTER_PX = 40
const HOUR_LINES = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i)

const PRIORITY_PILL = {
  1: 'bg-gray-800/90 text-gray-400 border border-gray-700',
  2: 'bg-blue-950/90 text-blue-400 border border-blue-900',
  3: 'bg-yellow-950/90 text-yellow-500 border border-yellow-900',
  4: 'bg-orange-950/90 text-orange-400 border border-orange-900',
  5: 'bg-red-950/90 text-red-400 border border-red-900',
}

const DAY_NUM = { M: 1, Tu: 2, W: 3, Th: 4, F: 5 }

function getDayPriority(dayDue) {
  if (dayDue === 'Wknd') return 1
  const todayNum = new Date().getDay()
  const dueNum = DAY_NUM[dayDue]
  if (!dueNum) return 1
  const daysAway = (dueNum - todayNum + 7) % 7
  return [4, 3, 2, 1, 1, 1, 1][Math.min(daysAway, 6)]
}

function formatHourLabel(h) {
  if (h === 12) return '12p'
  if (h > 12) return `${h - 12}p`
  return `${h}a`
}

function getTodayKey() {
  const d = new Date().getDay()
  if (d === 0 || d === 6) return 'Wknd'
  return TASK_DAYS[d - 1] ?? null
}

function timeToTop(timeDue) {
  const [h, m] = timeDue.split(':').map(Number)
  const minutesFromStart = h * 60 + m - START_HOUR * 60
  const clamped = Math.max(0, Math.min(minutesFromStart, TOTAL_HOURS * 60))
  return (clamped / 60) * HOUR_HEIGHT
}

function getPositions(scheduledTasks) {
  const sorted = [...scheduledTasks].sort((a, b) => a.timeDue.localeCompare(b.timeDue))
  const PILL_HEIGHT = 22
  const positions = []
  let lastBottom = -Infinity
  for (const task of sorted) {
    let top = timeToTop(task.timeDue)
    if (top < lastBottom + 2) top = lastBottom + 2
    lastBottom = top + PILL_HEIGHT
    positions.push({ task, top })
  }
  return positions
}

function pixelsToTime(relY) {
  const totalHours = START_HOUR + relY / HOUR_HEIGHT
  let h = Math.floor(totalHours)
  let rawM = Math.round((totalHours - h) * 60 / 15) * 15
  if (rawM >= 60) { h += 1; rawM = 0 }
  h = Math.max(START_HOUR, Math.min(h, END_HOUR - 1))
  return `${String(h).padStart(2, '0')}:${String(rawM).padStart(2, '0')}`
}

function TaskPill({ task, isSelected, isBeingDragged, onPointerDown }) {
  const color = PRIORITY_PILL[task.priority] || PRIORITY_PILL[1]
  return (
    <button
      onPointerDown={(e) => onPointerDown(e, task)}
      title={task.name}
      className={`w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate leading-tight touch-none select-none
        cursor-grab active:cursor-grabbing transition-all ${color}
        ${isSelected ? 'ring-1 ring-blue-500 ring-offset-1 ring-offset-black' : 'hover:brightness-125'}
        ${task.completed ? 'opacity-40' : ''}
        ${isBeingDragged ? 'opacity-30' : ''}`}
    >
      {task.name}
    </button>
  )
}

export default function WeeklyCalendar({ tasks, selectedTaskId, onSelectTask, onUpdateTask }) {
  const todayKey = getTodayKey()
  const timeGridRef = useRef(null)

  // Drag state — mutable ref so pointermove doesn't re-run effects
  const dragRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 })

  // Keep fresh refs to callbacks (avoids stale closures in the pointer effect)
  const cbRef = useRef({ onSelectTask, onUpdateTask, selectedTaskId })
  useEffect(() => { cbRef.current = { onSelectTask, onUpdateTask, selectedTaskId } })

  const startDrag = (e, task) => {
    e.preventDefault()
    dragRef.current = {
      taskId: task.id,
      task,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    }
    setGhostPos({ x: e.clientX, y: e.clientY })
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const onMove = (e) => {
      const d = dragRef.current
      if (!d) return
      if (!d.moved) {
        d.moved = Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 5
      }
      if (d.moved) setGhostPos({ x: e.clientX, y: e.clientY })
    }

    const onUp = (e) => {
      const d = dragRef.current
      if (!d) return
      const { onSelectTask, onUpdateTask, selectedTaskId } = cbRef.current

      if (d.moved && timeGridRef.current) {
        const rect = timeGridRef.current.getBoundingClientRect()
        const relX = e.clientX - rect.left - TIME_GUTTER_PX
        const relY = e.clientY - rect.top

        if (relX >= 0 && relX < rect.width - TIME_GUTTER_PX) {
          const colWidth = (rect.width - TIME_GUTTER_PX) / ALL_COLUMNS.length
          const colIndex = Math.max(0, Math.min(Math.floor(relX / colWidth), ALL_COLUMNS.length - 1))
          const col = ALL_COLUMNS[colIndex]

          const newDayDue = col.key
          // Recalculate time if dropped in the time grid area
          const newTimeDue = (relY >= 0 && relY <= TOTAL_HEIGHT)
            ? pixelsToTime(relY)
            : (d.task.timeDue || '')

          // Auto-update priority only if day changed; cap at 4 (P5 = manual only)
          const newPriority = newDayDue !== d.task.dayDue
            ? getDayPriority(newDayDue)
            : d.task.priority

          onUpdateTask(d.taskId, { dayDue: newDayDue, timeDue: newTimeDue, priority: newPriority })
        }
      } else if (!d.moved) {
        // Short press = select/deselect
        onSelectTask(d.taskId === selectedTaskId ? null : d.taskId)
      }

      dragRef.current = null
      setIsDragging(false)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [isDragging])

  // Bucket tasks by day
  const tasksByDay = Object.fromEntries(
    TASK_DAYS.map(d => [d, { scheduled: [], unscheduled: [] }])
  )
  for (const task of tasks) {
    const group = tasksByDay[task.dayDue]
    if (!group) continue
    if (task.timeDue) group.scheduled.push(task)
    else group.unscheduled.push(task)
  }

  const hasAnyUnscheduled = TASK_DAYS.some(d => tasksByDay[d].unscheduled.length > 0)
  const draggingTaskId = dragRef.current?.taskId

  return (
    <div style={{ cursor: isDragging ? 'grabbing' : 'default' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20" style={{ background: '#06080a' }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <h2 className="text-xs font-semibold text-gray-600 tracking-widest uppercase">This Week</h2>
          {selectedTaskId && (
            <button
              onClick={() => onSelectTask(null)}
              className="text-xs text-gray-700 hover:text-gray-400 transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex border-b border-green-900/40">
          <div className="w-10 flex-shrink-0" />
          {ALL_COLUMNS.map(({ key, label }) => {
            const isToday = key === todayKey
            return (
              <div
                key={key}
                className={`flex-1 flex flex-col items-center pb-1.5 pt-1 text-xs font-semibold tracking-wider ${
                  isToday ? 'text-green-500' : 'text-gray-600'
                }`}
              >
                <span>{label}</span>
                {isToday
                  ? <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-0.5" />
                  : <div className="w-1.5 h-1.5 mt-0.5" />
                }
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Unscheduled strip ── */}
      {hasAnyUnscheduled && (
        <div className="flex border-b border-green-900/20">
          <div className="w-10 flex-shrink-0 flex items-center justify-center">
            <span className="text-[9px] text-gray-700">—</span>
          </div>
          {ALL_COLUMNS.map(({ key, isWeekend }) => {
            const unscheduled = tasksByDay[key]?.unscheduled ?? []
            return (
              <div
                key={key}
                className={`flex-1 p-1 flex flex-col gap-0.5 min-h-8 border-l border-green-900/20 ${
                  key === todayKey ? 'bg-green-950/10' : ''
                }`}
              >
                {unscheduled.map(task => (
                  <TaskPill
                    key={task.id}
                    task={task}
                    isSelected={task.id === selectedTaskId}
                    isBeingDragged={task.id === draggingTaskId && isDragging && dragRef.current?.moved}
                    onPointerDown={startDrag}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Time grid ── */}
      <div ref={timeGridRef} className="flex" style={{ height: TOTAL_HEIGHT }}>
        {/* Time labels */}
        <div className="w-10 flex-shrink-0 relative select-none">
          {HOUR_LINES.map(h => (
            <div
              key={h}
              className="absolute right-1.5 text-[10px] text-gray-700 leading-none tabular-nums"
              style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 6 }}
            >
              {formatHourLabel(h)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {ALL_COLUMNS.map(({ key, isWeekend }) => {
          const positions = getPositions(tasksByDay[key]?.scheduled ?? [])
          return (
            <div
              key={key}
              className={`flex-1 relative border-l border-green-900/20 ${
                key === todayKey ? 'bg-green-950/[0.07]' : ''
              }`}
            >
              {HOUR_LINES.map(h => (
                <div
                  key={h}
                  className="absolute w-full border-t border-green-900/15"
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                />
              ))}
              {positions.map(({ task, top }) => (
                <div
                  key={task.id}
                  className="absolute left-0.5 right-0.5"
                  style={{ top }}
                >
                  <TaskPill
                    task={task}
                    isSelected={task.id === selectedTaskId}
                    isBeingDragged={task.id === draggingTaskId && isDragging && dragRef.current?.moved}
                    onPointerDown={startDrag}
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* ── Drag ghost ── */}
      {isDragging && dragRef.current?.moved && (
        <div
          style={{
            position: 'fixed',
            left: ghostPos.x + 10,
            top: ghostPos.y - 11,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          className={`text-[11px] px-2 py-0.5 rounded border truncate max-w-40 shadow-lg opacity-90 ${
            PRIORITY_PILL[dragRef.current.task.priority] || PRIORITY_PILL[1]
          }`}
        >
          {dragRef.current.task.name}
        </div>
      )}
    </div>
  )
}
