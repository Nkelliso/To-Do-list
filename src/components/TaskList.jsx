import { useState } from 'react'
import TaskRow from './TaskRow'

const DAY_ORDER = { M: 0, Tu: 1, W: 2, Th: 3, F: 4, Wknd: 5 }
const DAY_LABELS = { M: 'Monday', Tu: 'Tuesday', W: 'Wednesday', Th: 'Thursday', F: 'Friday', Wknd: 'Weekend' }
const ALL_DAYS = ['M', 'Tu', 'W', 'Th', 'F', 'Wknd']

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

export default function TaskList({ tasks, selectedTaskId, onSelectTask, onToggle, onDelete, onUpdate }) {
  const [activeTab, setActiveTab] = useState('todo')

  const activeTasks = sortByPriorityDayTime(tasks.filter(t => !t.completed))
  const completedTasks = sortByDayTime(tasks.filter(t => t.completed))

  // Group completed tasks by day
  const completedByDay = {}
  ALL_DAYS.forEach(d => { completedByDay[d] = [] })
  completedTasks.forEach(t => {
    if (completedByDay[t.dayDue]) completedByDay[t.dayDue].push(t)
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
        {[['todo', 'To Do'], ['completed', 'Completed']].map(([tab, label]) => (
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
            {tab === 'todo' && activeTasks.length > 0 && (
              <span className="ml-1.5 text-[10px] text-gray-600">{activeTasks.length}</span>
            )}
            {tab === 'completed' && completedTasks.length > 0 && (
              <span className="ml-1.5 text-[10px] text-gray-600">{completedTasks.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── To Do tab ── */}
      {activeTab === 'todo' && (
        activeTasks.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-center">
            <p className="text-gray-700 text-sm leading-relaxed">
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
        completedTasks.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-center">
            <p className="text-gray-700 text-sm leading-relaxed">
              No completed tasks yet.
            </p>
          </div>
        ) : (
          <div>
            {ALL_DAYS.map(day => {
              const dayTasks = completedByDay[day]
              if (!dayTasks.length) return null
              return (
                <div key={day} className="mb-5">
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="text-[10px] font-semibold text-stone-700 tracking-widest uppercase">
                      {DAY_LABELS[day]}
                    </span>
                    <div className="flex-1 h-px bg-gray-900" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {dayTasks.map(task => (
                      <TaskRow key={task.id} {...sharedRowProps(task)} />
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
