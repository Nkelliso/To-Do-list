import { useState } from 'react'
import TaskRow from './TaskRow'

const DAY_ORDER = { M: 0, Tu: 1, W: 2, Th: 3, F: 4, Wknd: 5 }
const DAY_LABELS = { M: 'Monday', Tu: 'Tuesday', W: 'Wednesday', Th: 'Thursday', F: 'Friday', Wknd: 'Weekend' }
const ALL_DAYS = ['M', 'Tu', 'W', 'Th', 'F', 'Wknd']

// ── Helpers ─────────────────────────────────────────────────────────────────

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Returns true if the Firestore timestamp is from today
function isCompletedToday(timestamp) {
  if (!timestamp) return false
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return isSameDay(date, new Date())
  } catch {
    return false
  }
}

function formatCompletedDate(timestamp) {
  if (!timestamp) return ''
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (isSameDay(date, now)) return 'Today'
    if (isSameDay(date, yesterday)) return 'Yesterday'
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = Number(h)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const display = hour % 12 || 12
  return `${display}:${m}${ampm}`
}

function sortByPriorityDayTime(tasks) {
  return [...tasks].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    const dayDiff = (DAY_ORDER[a.dayDue] ?? 99) - (DAY_ORDER[b.dayDue] ?? 99)
    if (dayDiff !== 0) return dayDiff
    return (a.timeDue || '').localeCompare(b.timeDue || '')
  })
}

function sortByDayTime(tasks) {
  return [...tasks].sort((a, b) => {
    const dayDiff = (DAY_ORDER[a.dayDue] ?? 99) - (DAY_ORDER[b.dayDue] ?? 99)
    if (dayDiff !== 0) return dayDiff
    return (a.timeDue || '').localeCompare(b.timeDue || '')
  })
}

// ── Completed task row ───────────────────────────────────────────────────────

function CompletedRow({ task, onToggle, onDelete }) {
  const completedLabel = formatCompletedDate(task.completedAt)
  const dueLabel = DAY_LABELS[task.dayDue] || task.dayDue

  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg group hover:bg-white/[0.02] transition-colors">
      {/* Uncheck to move back to To Do */}
      <input
        type="checkbox"
        checked
        onChange={() => onToggle(task.id, task.completed)}
        className="w-3.5 h-3.5 mt-0.5 accent-green-600 cursor-pointer flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-500 line-through truncate">{task.name}</p>
        <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
          {completedLabel && (
            <span className="text-[10px] text-stone-700">
              Completed: {completedLabel}
            </span>
          )}
          <span className="text-[10px] text-stone-700">
            Due: {dueLabel}{task.timeDue ? ` · ${formatTime(task.timeDue)}` : ''}
          </span>
        </div>
      </div>

      {/* Delete — always visible on mobile */}
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-0.5 mt-0.5 rounded text-stone-700 hover:text-red-400 hover:bg-red-950/50 transition-all cursor-pointer flex-shrink-0"
        title="Delete"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function TaskList({ tasks, selectedTaskId, onSelectTask, onToggle, onDelete, onUpdate }) {
  const [activeTab, setActiveTab] = useState('todo')

  // To Do: uncompleted tasks + tasks completed TODAY (stay until midnight)
  const activeTasks = sortByPriorityDayTime(
    tasks.filter(t => !t.completed || isCompletedToday(t.completedAt))
  )

  // Completed: tasks completed BEFORE today (midnight has passed)
  const archivedTasks = sortByDayTime(
    tasks.filter(t => t.completed && !isCompletedToday(t.completedAt))
  )

  // Group archived tasks by dayDue
  const archivedByDay = {}
  ALL_DAYS.forEach(d => { archivedByDay[d] = [] })
  archivedTasks.forEach(t => {
    if (archivedByDay[t.dayDue]) archivedByDay[t.dayDue].push(t)
  })

  const sharedRowProps = (task) => ({
    task,
    isSelected: task.id === selectedTaskId,
    onSelect: () => onSelectTask(task.id === selectedTaskId ? null : task.id),
    onToggle,
    onDelete,
    onUpdate,
  })

  return (
    <div className="p-4">
      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: '#1c1610' }}>
        {[['todo', 'To Do', activeTasks.length], ['completed', 'Completed', archivedTasks.length]].map(([tab, label, count]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors select-none cursor-pointer ${
              activeTab === tab
                ? 'bg-green-900/50 text-green-400'
                : 'text-stone-600 hover:text-stone-400'
            }`}
          >
            {label}
            {count > 0 && (
              <span className="ml-1.5 text-[10px] text-stone-600">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── To Do tab ── */}
      {activeTab === 'todo' && (
        activeTasks.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-center">
            <p className="text-stone-700 text-sm leading-relaxed">
              No tasks this week.<br />Add one to get started.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {activeTasks.map(task => (
              <TaskRow key={task.id} {...sharedRowProps(task)} />
            ))}
          </div>
        )
      )}

      {/* ── Completed tab ── */}
      {activeTab === 'completed' && (
        archivedTasks.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-center">
            <p className="text-stone-700 text-sm leading-relaxed">
              Completed tasks appear here<br />at the end of each day.
            </p>
          </div>
        ) : (
          <div>
            {ALL_DAYS.map(day => {
              const dayTasks = archivedByDay[day]
              if (!dayTasks.length) return null
              return (
                <div key={day} className="mb-5">
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="text-[10px] font-semibold text-stone-700 tracking-widest uppercase">
                      {DAY_LABELS[day]}
                    </span>
                    <div className="flex-1 h-px bg-stone-900" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {dayTasks.map(task => (
                      <CompletedRow
                        key={task.id}
                        task={task}
                        onToggle={onToggle}
                        onDelete={onDelete}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
