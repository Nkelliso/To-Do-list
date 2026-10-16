import { useRef, useEffect, useState, useCallback } from 'react'
import { effectivePriority, getDayPriority } from '../utils/priority'
import { setDone } from '../utils/subtasks'
import { useContextMenuTrigger } from '../hooks/useContextMenuTrigger'
import SubtaskList from './SubtaskList'
import TaskContextMenu from './TaskContextMenu'

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
  const [priorityOpen, setPriorityOpen] = useState(false)
  const priorityRef = useRef(null)
  const [subtasksOpen, setSubtasksOpen] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [menu, setMenu] = useState(null) // { x, y } while the right-click menu is open
  const closeMenu = useCallback(() => setMenu(null), [])
  const menuTrigger = useContextMenuTrigger((x, y) => setMenu({ x, y }))

  const subtasks = task.subtasks || []
  const subtasksDone = subtasks.filter((s) => s.done).length

  // Close the priority picker on outside click or Escape
  useEffect(() => {
    if (!priorityOpen) return
    const handleDown = (e) => {
      if (priorityRef.current && !priorityRef.current.contains(e.target)) setPriorityOpen(false)
    }
    const handleKey = (e) => { if (e.key === 'Escape') setPriorityOpen(false) }
    document.addEventListener('pointerdown', handleDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [priorityOpen])

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
  // Day-based urgency is a floor (see effectivePriority) — picking below it wouldn't show
  const dayFloor = getDayPriority(task.dayDue)

  const choosePriority = (p) => {
    if (p !== task.priority) onUpdate(task.id, { priority: p })
    setPriorityOpen(false)
  }

  // ── Subtasks ──
  // The main task is done exactly when every subtask is done, so a subtask change
  // that flips that also flips the main task, in the same write. Only the first
  // level counts here; deeper subtasks roll up into their parent subtask.
  const saveSubtasks = (next) => {
    const allDone = next.length > 0 && next.every((s) => s.done)
    if (next.length > 0 && allDone !== !!task.completed) {
      onToggle(task.id, task.completed, { subtasks: next })
    } else {
      onUpdate(task.id, { subtasks: next })
    }
  }

  // Checking the main task checks off its subtasks; unchecking leaves them as they are
  const toggleMain = () => {
    if (!task.completed && subtasks.some((s) => !s.done)) {
      onToggle(task.id, false, { subtasks: subtasks.map((s) => setDone(s, true)) })
    } else {
      onToggle(task.id, task.completed)
    }
  }

  const startAddSubtask = () => {
    setSubtasksOpen(true)
    setAddingSubtask(true)
  }

  const menuItems = [
    { label: 'Add subtask', onClick: startAddSubtask },
    { label: subtasks.length ? 'Delete task and subtasks' : 'Delete task', onClick: () => onDelete(task.id), danger: true },
  ]

  const showChevron = subtasks.length > 0 || addingSubtask

  return (
    <div {...menuTrigger}>
    <div
      ref={rowRef}
      onClick={editing ? undefined : onSelect}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all group cursor-pointer select-none ${
        isSelected
          ? 'border-green-700/60 bg-green-950/20'
          : 'border-transparent hover:border-green-900/50 hover:bg-white/[0.02]'
      } ${task.completed ? 'opacity-50' : ''}`}
    >
      {/* Expand / collapse subtasks — spacer keeps checkboxes lined up on rows without any */}
      {showChevron ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setSubtasksOpen((o) => !o) }}
          className="w-3.5 h-3.5 flex-shrink-0 text-stone-500 hover:text-stone-300 cursor-pointer"
          title={subtasksOpen ? 'Hide subtasks' : 'Show subtasks'}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${subtasksOpen ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <span className="w-3.5 flex-shrink-0" />
      )}

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={(e) => { e.stopPropagation(); toggleMain() }}
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

      {/* Subtask progress count — tap to show/hide */}
      {subtasks.length > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setSubtasksOpen((o) => !o) }}
          className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-full flex-shrink-0 cursor-pointer ${
            subtasksDone === subtasks.length ? 'bg-green-600/15 text-green-400' : 'bg-white/5 text-stone-400'
          }`}
          title={subtasksOpen ? 'Hide subtasks' : 'Show subtasks'}
        >
          {subtasksDone}/{subtasks.length}
        </button>
      )}

      {/* Priority badge — tap to change */}
      <div ref={priorityRef} className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setPriorityOpen((o) => !o)}
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full cursor-pointer hover:ring-1 hover:ring-white/20 ${
            PRIORITY_BADGE[priority] || PRIORITY_BADGE[1]
          } ${priorityOpen ? 'ring-1 ring-white/30' : ''}`}
          title="Change priority"
        >
          P{priority}
        </button>

        {priorityOpen && (
          <div
            className="absolute right-0 top-full mt-1.5 z-30 flex gap-1 p-1.5 rounded-lg border border-green-900/50 shadow-xl"
            style={{ background: '#3e2e38' }}
          >
            {[1, 2, 3, 4, 5].map((p) => {
              const blocked = p < dayFloor && p !== 5
              return (
                <button
                  key={p}
                  type="button"
                  disabled={blocked}
                  onClick={() => choosePriority(p)}
                  title={blocked ? `Due soon — can't go below P${dayFloor}` : undefined}
                  className={`text-[11px] font-semibold px-2 py-1 rounded-full transition-all ${
                    PRIORITY_BADGE[p]
                  } ${p === priority ? 'ring-1 ring-white/40' : ''} ${
                    blocked ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer hover:brightness-125'
                  }`}
                >
                  P{p}
                </button>
              )
            })}
          </div>
        )}
      </div>

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

    {/* Subtask progress bar */}
    {subtasks.length > 0 && (
      <div className="h-[3px] ml-[38px] mr-3 -mt-0.5 mb-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full bg-green-600 transition-[width] duration-200"
          style={{ width: `${(subtasksDone / subtasks.length) * 100}%` }}
        />
      </div>
    )}

    {subtasksOpen && (subtasks.length > 0 || addingSubtask) && (
      <SubtaskList
        subtasks={subtasks}
        onChange={saveSubtasks}
        adding={addingSubtask}
        onStopAdding={() => setAddingSubtask(false)}
      />
    )}

    {menu && <TaskContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={closeMenu} />}
    </div>
  )
}
