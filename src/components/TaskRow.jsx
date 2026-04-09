import { useRef, useEffect, useState } from 'react'
import { effectivePriority } from '../utils/priority'

const PRIORITY_BADGE = {
  1: 'bg-gray-800 text-gray-500',
  2: 'bg-blue-950 text-blue-400',
  3: 'bg-yellow-950 text-yellow-500',
  4: 'bg-orange-950 text-orange-400',
  5: 'bg-red-950 text-red-400',
}

const PRIORITY_TEXT_SIZE = {
  1: 'text-base',
  2: 'text-lg',
  3: 'text-xl',
  4: 'text-2xl',
  5: 'text-3xl',
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = Number(h)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const display = hour % 12 || 12
  return `${display}:${m}${ampm}`
}

export default function TaskRow({ task, isSelected, onSelect, onToggle, onDelete, onUpdate }) {
  const rowRef = useRef(null)
  const inputRef = useRef(null)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(task.name)

  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isSelected])

  // Focus and select all text when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const startEdit = (e) => {
    e.stopPropagation()
    setEditName(task.name)
    setEditing(true)
  }

  const saveEdit = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== task.name) {
      onUpdate(task.id, { name: trimmed })
    }
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditName(task.name)
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  const priority = effectivePriority(task)
  const textSize = PRIORITY_TEXT_SIZE[priority] || PRIORITY_TEXT_SIZE[1]

  return (
    <div
      ref={rowRef}
      onClick={editing ? undefined : onSelect}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all group cursor-pointer select-none ${
        isSelected
          ? 'border-green-700/60 bg-green-950/20'
          : 'border-transparent hover:border-green-900/50 hover:bg-white/[0.02]'
      } ${task.completed ? 'opacity-50' : ''}`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={(e) => { e.stopPropagation(); onToggle(task.id, task.completed) }}
        onClick={(e) => e.stopPropagation()}
        className="w-4 h-4 rounded accent-green-600 cursor-pointer flex-shrink-0"
      />

      {/* Task name — tap to edit */}
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className={`flex-1 min-w-0 bg-transparent border-b border-green-700 outline-none font-medium leading-snug ${textSize} text-gray-100 select-text`}
        />
      ) : (
        <span
          onClick={startEdit}
          className={`flex-1 min-w-0 truncate font-medium leading-snug ${textSize} ${
            task.completed ? 'line-through text-gray-600' : 'text-gray-200'
          }`}
        >
          {task.name}
        </span>
      )}

      {/* Priority badge */}
      <span
        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
          PRIORITY_BADGE[priority] || PRIORITY_BADGE[1]
        }`}
      >
        P{priority}
      </span>

      {/* Day + time */}
      <div className="flex items-center gap-1 flex-shrink-0 text-xs text-gray-600 tabular-nums">
        <span>{task.dayDue}</span>
        {task.timeDue && <span>{formatTime(task.timeDue)}</span>}
      </div>

      {/* Delete — always visible on mobile, hover-only on desktop */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-0.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-950/50 transition-all cursor-pointer flex-shrink-0"
        title="Delete task"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
