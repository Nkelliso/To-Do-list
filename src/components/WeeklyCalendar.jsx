import { useEffect, useRef, useState } from 'react'

const TASK_DAYS = ['M', 'Tu', 'W', 'Th', 'F', 'Wknd']

const ALL_COLUMNS = [
  { key: 'M',    label: 'M',       fullName: 'Monday' },
  { key: 'Tu',   label: 'Tu',      fullName: 'Tuesday' },
  { key: 'W',    label: 'W',       fullName: 'Wednesday' },
  { key: 'Th',   label: 'Th',      fullName: 'Thursday' },
  { key: 'F',    label: 'F',       fullName: 'Friday' },
  { key: 'Wknd', label: 'Weekend', fullName: 'Weekend' },
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

// Groups scheduled tasks by hour for the mobile compact view
function groupByHour(tasks) {
  const groups = {}
  for (const task of tasks) {
    if (!task.timeDue) continue
    const h = parseInt(task.timeDue.split(':')[0], 10)
    if (!groups[h]) groups[h] = []
    groups[h].push(task)
  }
  return Object.keys(groups)
    .sort((a, b) => Number(a) - Number(b))
    .map(h => ({ hour: Number(h), tasks: groups[h] }))
}

function TaskPill({ task, isSelected, isBeingDragged, onPointerDown }) {
  const color = PRIORITY_PILL[task.priority] || PRIORITY_PILL[1]
  return (
    <button
      onPointerDown={(e) => onPointerDown(e, task)}
      title={task.name}
      className={`w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate leading-tight
        touch-none select-none cursor-grab active:cursor-grabbing transition-all ${color}
        ${isSelected ? 'ring-1 ring-blue-500 ring-offset-1 ring-offset-black' : 'hover:brightness-125'}
        ${task.completed ? 'opacity-40' : ''}
        ${isBeingDragged ? 'opacity-30' : ''}`}
    >
      {task.name}
    </button>
  )
}

// ── Mobile compact view ─────────────────────────────────────────────────────
function MobileCalendarView({ tasksByDay, todayKey, selectedTaskId, onSelectTask, startDrag }) {
  return (
    <div className="px-3 pb-6 pt-1">
      {ALL_COLUMNS.map(({ key, fullName }) => {
        const group = tasksByDay[key] || { scheduled: [], unscheduled: [] }
        const byHour = groupByHour(group.scheduled)
        const isEmpty = group.unscheduled.length === 0 && group.scheduled.length === 0
        const isToday = key === todayKey

        return (
          <div
            key={key}
            className={`mb-2 rounded-lg border overflow-hidden ${
              isToday ? 'border-green-700/50' : 'border-green-900/30'
            }`}
          >
            {/* Day label row */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 ${
              isToday ? 'bg-green-950/30' : 'bg-white/[0.02]'
            }`}>
              <span className={`text-xs font-semibold ${isToday ? 'text-green-400' : 'text-gray-500'}`}>
                {fullName}
              </span>
              {isToday && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
            </div>

            {/* Task slots */}
            <div className="px-2 py-1.5 flex flex-col gap-1">
              {isEmpty ? (
                <p className="text-[11px] text-gray-700 px-1">No tasks scheduled</p>
              ) : (
                <>
                  {/* Unscheduled tasks */}
                  {group.unscheduled.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-gray-700 w-7 pt-0.5 flex-shrink-0 tabular-nums">—</span>
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        {group.unscheduled.map(task => (
                          <TaskPill
                            key={task.id}
                            task={task}
                            isSelected={task.id === selectedTaskId}
                            isBeingDragged={false}
                            onPointerDown={startDrag}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scheduled tasks grouped by hour */}
                  {byHour.map(({ hour, tasks }) => (
                    <div key={hour} className="flex items-start gap-2">
                      <span className="text-[10px] text-gray-600 w-7 pt-0.5 flex-shrink-0 tabular-nums">
                        {formatHourLabel(hour)}
                      </span>
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        {tasks.map(task => (
                          <TaskPill
                            key={task.id}
                            task={task}
                            isSelected={task.id === selectedTaskId}
                            isBeingDragged={false}
                            onPointerDown={startDrag}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function WeeklyCalendar({ tasks, selectedTaskId, onSelectTask, onUpdateTask }) {
  const todayKey = getTodayKey()
  const timeGridRef = useRef(null)

  // Responsive: track whether we're on mobile
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Drag state
  const dragRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 })

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
          const newTimeDue = (relY >= 0 && relY <= TOTAL_HEIGHT)
            ? pixelsToTime(relY)
            : (d.task.timeDue || '')
          const newPriority = newDayDue !== d.task.dayDue
            ? getDayPriority(newDayDue)
            : d.task.priority

          onUpdateTask(d.taskId, { dayDue: newDayDue, timeDue: newTimeDue, priority: newPriority })
        }
      } else if (!d.moved) {
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
  const draggingTaskId = isDragging && dragRef.current?.moved ? dragRef.current?.taskId : null

  return (
    <div style={{ cursor: isDragging ? 'grabbing' : 'default' }}>

      {/* ── Sticky header (shared by both views) ── */}
      <div className="sticky top-0 z-20" style={{ background: '#120f08' }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <h2 className="text-xs font-semibold text-gray-600 tracking-widest uppercase select-none">
            This Week
          </h2>
          {selectedTaskId && (
            <button
              onClick={() => onSelectTask(null)}
              className="text-xs text-gray-700 hover:text-gray-400 transition-colors cursor-pointer select-none"
            >
              Reset
            </button>
          )}
        </div>

        {/* Day column headers — desktop only */}
        <div className="hidden md:flex border-b border-green-900/40">
          <div className="w-10 flex-shrink-0" />
          {ALL_COLUMNS.map(({ key, label }) => {
            const isToday = key === todayKey
            return (
              <div
                key={key}
                className={`flex-1 flex flex-col items-center pb-1.5 pt-1 text-xs font-semibold tracking-wider select-none ${
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

      {/* ── Mobile: compact day-by-day view ── */}
      {isMobile && (
        <MobileCalendarView
          tasksByDay={tasksByDay}
          todayKey={todayKey}
          selectedTaskId={selectedTaskId}
          onSelectTask={onSelectTask}
          startDrag={startDrag}
        />
      )}

      {/* ── Desktop: full scrollable time grid ── */}
      {!isMobile && (
        <>
          {/* Unscheduled strip */}
          {hasAnyUnscheduled && (
            <div className="flex border-b border-green-900/20">
              <div className="w-10 flex-shrink-0 flex items-center justify-center">
                <span className="text-[9px] text-gray-700">—</span>
              </div>
              {ALL_COLUMNS.map(({ key }) => (
                <div
                  key={key}
                  className={`flex-1 p-1 flex flex-col gap-0.5 min-h-8 border-l border-green-900/20 ${
                    key === todayKey ? 'bg-green-950/10' : ''
                  }`}
                >
                  {(tasksByDay[key]?.unscheduled ?? []).map(task => (
                    <TaskPill
                      key={task.id}
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      isBeingDragged={task.id === draggingTaskId}
                      onPointerDown={startDrag}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Time grid */}
          <div ref={timeGridRef} className="flex" style={{ height: TOTAL_HEIGHT }}>
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

            {ALL_COLUMNS.map(({ key }) => {
              const positions = getPositions(tasksByDay[key]?.scheduled ?? [])
              const isToday = key === todayKey
              return (
                <div
                  key={key}
                  className={`flex-1 relative border-l border-green-900/20 ${
                    isToday ? 'bg-green-950/[0.07]' : ''
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
                    <div key={task.id} className="absolute left-0.5 right-0.5" style={{ top }}>
                      <TaskPill
                        task={task}
                        isSelected={task.id === selectedTaskId}
                        isBeingDragged={task.id === draggingTaskId}
                        onPointerDown={startDrag}
                      />
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}

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
