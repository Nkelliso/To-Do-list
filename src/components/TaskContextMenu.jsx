import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Right-click / long-press menu. Rendered into <body> so the scrolling task
// column can't clip it. items: [{ label, onClick, danger? }]
export default function TaskContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null)
  const [pos, setPos] = useState({ left: x, top: y })

  // Keep the menu on screen near the right/bottom edges
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const { offsetWidth: w, offsetHeight: h } = el
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - w - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - h - 8)),
    })
  }, [x, y])

  useEffect(() => {
    const handleDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('pointerdown', handleDown)
    document.addEventListener('keydown', handleKey)
    // Capture so scrolling the task column (not just the window) closes it
    window.addEventListener('scroll', onClose, true)
    return () => {
      document.removeEventListener('pointerdown', handleDown)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={menuRef}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 min-w-44 p-1 rounded-lg border border-green-900/50 shadow-xl flex flex-col"
      style={{ ...pos, background: '#3e2e38' }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => { onClose(); item.onClick() }}
          className={`text-left text-sm px-3 py-2 rounded-md cursor-pointer hover:bg-white/[0.06] ${
            item.danger ? 'text-red-400' : 'text-gray-200'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  )
}
