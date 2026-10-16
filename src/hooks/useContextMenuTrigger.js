import { useEffect, useRef } from 'react'

const isTextField = (el) => el.tagName === 'INPUT' && el.type === 'text'

// Right-click, plus long-press for touch (iPhone Safari never fires contextmenu).
// Spread the returned props on an element; onOpen(x, y) fires with the pointer position.
// Scopes nest: an event only counts for the closest element using this hook, so a
// subtask's menu doesn't also open its parent task's.
export function useContextMenuTrigger(onOpen) {
  const press = useRef({ timer: null, x: 0, y: 0, fired: false })

  useEffect(() => {
    const p = press.current
    return () => clearTimeout(p.timer)
  }, [])

  const owns = (e) =>
    !isTextField(e.target) && e.target.closest('[data-menu-scope]') === e.currentTarget

  return {
    'data-menu-scope': '',
    style: { WebkitTouchCallout: 'none' },

    onContextMenu: (e) => {
      if (!owns(e)) return // text fields keep the native copy/paste menu
      e.preventDefault()
      onOpen(e.clientX, e.clientY)
    },

    onPointerDown: (e) => {
      if (e.pointerType !== 'touch' || !owns(e)) return
      const p = press.current
      p.x = e.clientX
      p.y = e.clientY
      p.fired = false
      clearTimeout(p.timer)
      p.timer = setTimeout(() => {
        p.fired = true
        onOpen(p.x, p.y)
      }, 500)
    },

    onPointerMove: (e) => {
      const p = press.current
      if (Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y) > 8) clearTimeout(p.timer)
    },
    onPointerUp: () => clearTimeout(press.current.timer),
    onPointerCancel: () => clearTimeout(press.current.timer),

    // The tap that ends a long-press shouldn't also select the row or start editing
    onClickCapture: (e) => {
      if (press.current.fired) {
        press.current.fired = false
        e.stopPropagation()
        e.preventDefault()
      }
    },
  }
}
