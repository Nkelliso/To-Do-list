import { useCallback, useEffect, useRef, useState } from 'react'
import { useContextMenuTrigger } from '../hooks/useContextMenuTrigger'
import { MAX_SUBTASK_DEPTH, newSubtaskId, setDone, withChildren } from '../utils/subtasks'
import TaskContextMenu from './TaskContextMenu'

function SubtaskItem({ subtask, depth, onChange, onDelete }) {
  const inputRef = useRef(null)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(subtask.name)
  const [adding, setAdding] = useState(false)
  const [menu, setMenu] = useState(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const menuTrigger = useContextMenuTrigger((x, y) => setMenu({ x, y }))

  const children = subtask.subtasks || []
  const childrenDone = children.filter((c) => c.done).length
  const canNest = depth < MAX_SUBTASK_DEPTH

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const saveEdit = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== subtask.name) onChange({ ...subtask, name: trimmed })
    setEditing(false)
  }

  const menuItems = [
    ...(canNest ? [{ label: 'Add subtask', onClick: () => setAdding(true) }] : []),
    { label: children.length ? 'Delete with its subtasks' : 'Delete subtask', onClick: onDelete, danger: true },
  ]

  return (
    <div {...menuTrigger}>
      <div className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md group/sub hover:bg-white/[0.02] ${subtask.done ? 'opacity-50' : ''}`}>
        <input
          type="checkbox"
          checked={subtask.done}
          onChange={() => onChange(setDone(subtask, !subtask.done))}
          className={`${depth > 1 ? 'w-3 h-3' : 'w-3.5 h-3.5'} accent-green-600 cursor-pointer flex-shrink-0`}
        />

        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') { setEditName(subtask.name); setEditing(false) }
            }}
            className={`flex-1 min-w-0 bg-transparent border-b border-green-700 outline-none ${depth > 1 ? 'text-sm' : 'text-[15px]'} text-gray-100 select-text`}
          />
        ) : (
          <span
            onClick={() => { setEditName(subtask.name); setEditing(true) }}
            className={`flex-1 min-w-0 truncate leading-snug ${depth > 1 ? 'text-sm' : 'text-[15px]'} ${
              subtask.done ? 'line-through text-gray-600' : 'text-stone-300'
            }`}
          >
            {subtask.name}
          </span>
        )}

        {children.length > 0 && (
          <span className={`text-[10px] tabular-nums flex-shrink-0 ${childrenDone === children.length ? 'text-green-400' : 'text-stone-500'}`}>
            {childrenDone}/{children.length}
          </span>
        )}

        {/* Delete — always visible on mobile, hover-only on desktop */}
        <button
          onClick={onDelete}
          className="opacity-100 md:opacity-0 md:group-hover/sub:opacity-100 p-0.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-950/50 transition-all cursor-pointer flex-shrink-0"
          title="Delete subtask"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {(children.length > 0 || adding) && (
        <SubtaskList
          subtasks={children}
          depth={depth + 1}
          onChange={(next) => onChange(withChildren(subtask, next))}
          adding={adding}
          onStopAdding={() => setAdding(false)}
        />
      )}

      {menu && <TaskContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={closeMenu} />}
    </div>
  )
}

// A list of subtasks at `depth` (1 = a task's subtasks, 2 = their subtasks).
// onChange gets the whole new list. `adding` shows the new-subtask input:
// Enter adds and keeps it open for the next one, Escape or blur closes it.
export default function SubtaskList({ subtasks, depth = 1, onChange, adding, onStopAdding }) {
  const addRef = useRef(null)
  const cancelled = useRef(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (adding && addRef.current) {
      cancelled.current = false
      addRef.current.focus()
    }
  }, [adding])

  const commit = (keepGoing) => {
    const trimmed = newName.trim()
    if (trimmed) onChange([...subtasks, { id: newSubtaskId(), name: trimmed, done: false }])
    setNewName('')
    if (!keepGoing || !trimmed) onStopAdding()
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`${depth === 1 ? 'ml-[38px] mr-3 mb-1.5' : 'ml-[22px]'} pl-2 border-l border-green-400/20 flex flex-col gap-0.5`}
    >
      {subtasks.map((s) => (
        <SubtaskItem
          key={s.id}
          subtask={s}
          depth={depth}
          onChange={(item) => onChange(subtasks.map((x) => (x.id === s.id ? item : x)))}
          onDelete={() => onChange(subtasks.filter((x) => x.id !== s.id))}
        />
      ))}

      {adding && (
        <div className="flex items-center gap-2.5 px-2.5 py-1.5">
          <span className="w-3.5 text-center text-green-400 text-sm flex-shrink-0">+</span>
          <input
            ref={addRef}
            type="text"
            value={newName}
            placeholder="Subtask name"
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => { if (!cancelled.current) commit(false) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit(true)
              if (e.key === 'Escape') { cancelled.current = true; setNewName(''); onStopAdding() }
            }}
            className={`flex-1 min-w-0 bg-transparent border-b border-green-700 outline-none ${depth > 1 ? 'text-sm' : 'text-[15px]'} text-gray-100 placeholder:text-stone-600 select-text`}
          />
        </div>
      )}
    </div>
  )
}
