import { useState, useEffect } from 'react'

const DAYS = ['M', 'Tu', 'W', 'Th', 'F', 'Wknd']
const DAY_LABEL = { M: 'M', Tu: 'Tu', W: 'W', Th: 'Th', F: 'F', Wknd: 'Weekend' }

const PRIORITY_LABELS = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent', 5: 'Critical' }

const PRIORITY_COLORS = {
  1: 'text-gray-400',
  2: 'text-blue-400',
  3: 'text-yellow-500',
  4: 'text-orange-400',
  5: 'text-red-400',
}

// Day number in the week (Mon=1 … Fri=5)
const DAY_NUM = { M: 1, Tu: 2, W: 3, Th: 4, F: 5 }

function getDayPriority(dayDue) {
  if (dayDue === 'Wknd') return 1
  const todayNum = new Date().getDay() // 0=Sun, 1=Mon … 6=Sat
  const dueNum = DAY_NUM[dayDue]
  if (!dueNum) return 1
  const daysAway = (dueNum - todayNum + 7) % 7
  // 0 days away → P4, 1 → P3, 2 → P2, 3+ → P1
  const lookup = [4, 3, 2, 1, 1, 1, 1]
  return lookup[Math.min(daysAway, lookup.length - 1)]
}

export default function AddTaskModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [dayDue, setDayDue] = useState('M')
  const [timeDue, setTimeDue] = useState('09:00')
  const [priority, setPriority] = useState(() => getDayPriority('M'))
  const [error, setError] = useState('')

  // Escape to close
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Auto-update priority when day changes
  useEffect(() => {
    setPriority(getDayPriority(dayDue))
  }, [dayDue])

  const handleSave = () => {
    if (!name.trim()) {
      setError('Task name is required.')
      return
    }
    onSave({ name: name.trim(), dayDue, timeDue, priority: Number(priority) })
    setName('')
    setDayDue('M')
    setTimeDue('09:00')
    setPriority(getDayPriority('M'))
    setError('')
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="border border-green-900/50 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 flex flex-col gap-5"
        style={{ background: '#1c1610' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-semibold text-amber-100/90">Add Task</h2>
          <p className="text-xs text-stone-600 mt-0.5">Appears in both the task list and calendar once saved.</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-400">Task Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="What needs to be done?"
              autoFocus
              className="border border-green-900/50 text-stone-200 placeholder-stone-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent"
              style={{ background: '#120f08' }}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-stone-400">Day Due</label>
              <select
                value={dayDue}
                onChange={(e) => setDayDue(e.target.value)}
                className="border border-green-900/50 text-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent"
                style={{ background: '#120f08' }}
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>{DAY_LABEL[d]}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-stone-400">Time Due</label>
              <input
                type="time"
                value={timeDue}
                onChange={(e) => setTimeDue(e.target.value)}
                className="border border-green-900/50 text-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent"
                style={{ background: '#120f08' }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-stone-400">Priority</label>
              <span className={`text-sm font-semibold ${PRIORITY_COLORS[priority]}`}>
                {priority} — {PRIORITY_LABELS[priority]}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full accent-green-600"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>Low</span>
              <span>Critical</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-200 transition-colors cursor-pointer select-none"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium text-white bg-green-700 hover:bg-green-600 rounded-lg transition-colors cursor-pointer select-none"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
