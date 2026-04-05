import { useEffect, useRef, useState } from 'react'

export default function IdeasPage({ content, onChange }) {
  const editorRef = useRef(null)
  const debounceRef = useRef(null)
  const [saved, setSaved] = useState(false)
  const initialized = useRef(false)

  // Set HTML once on mount (don't overwrite while user is typing)
  useEffect(() => {
    if (editorRef.current && !initialized.current) {
      editorRef.current.innerHTML = content || ''
      initialized.current = true
    }
  })

  const triggerSave = () => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      }
    }, 500)
  }

  // Bullet auto-continue: if line starts with "- ", pressing Enter
  // continues the bullet. If line is empty bullet ("- "), Enter exits.
  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return

    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return

    const range = sel.getRangeAt(0)

    // Walk up from the cursor to find the nearest block-level element
    // inside the editor (div or p that is a direct child of editorRef)
    let node = range.startContainer
    let block = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
    while (block && block !== editorRef.current) {
      if (block.parentElement === editorRef.current) break
      block = block.parentElement
    }

    const lineText = block && block !== editorRef.current
      ? block.textContent
      : ''

    if (!lineText.startsWith('- ')) return

    e.preventDefault()

    // Empty bullet ("- " with nothing after) → exit bullet, plain newline
    if (lineText === '- ') {
      // Clear the dash from the current line then insert paragraph
      const clearRange = document.createRange()
      clearRange.selectNodeContents(block)
      sel.removeAllRanges()
      sel.addRange(clearRange)
      document.execCommand('delete')
      document.execCommand('insertParagraph')
    } else {
      // Continue bullet on the next line
      document.execCommand('insertParagraph')
      document.execCommand('insertText', false, '- ')
    }
  }

  // Use onMouseDown + preventDefault so toolbar clicks don't steal editor focus
  const fmt = (cmd, value) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value ?? null)
  }

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: '#120f08' }}>

      {/* ── Toolbar ── */}
      <div
        className="flex items-center gap-0.5 px-4 py-2 border-b border-green-900/30 flex-shrink-0"
        style={{ background: '#18120a' }}
      >
        <Btn onMouseDown={() => fmt('bold')} title="Bold">
          <span className="font-bold">B</span>
        </Btn>
        <Btn onMouseDown={() => fmt('italic')} title="Italic">
          <span className="italic">I</span>
        </Btn>
        <Btn onMouseDown={() => fmt('strikeThrough')} title="Strikethrough">
          <span className="line-through">S</span>
        </Btn>

        <div className="w-px h-4 bg-green-900/40 mx-1.5 flex-shrink-0" />

        <Btn onMouseDown={() => fmt('fontSize', '5')} title="Larger text">
          <span className="text-base leading-none">A</span><span className="text-[9px] align-super leading-none ml-px">+</span>
        </Btn>
        <Btn onMouseDown={() => fmt('fontSize', '2')} title="Smaller text">
          <span className="text-xs leading-none">A</span><span className="text-[9px] align-super leading-none ml-px">−</span>
        </Btn>
      </div>

      {/* ── Editor ── */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <span
          className="absolute top-3 right-4 text-xs text-green-600 pointer-events-none select-none z-10 transition-opacity duration-500"
          style={{ opacity: saved ? 1 : 0 }}
        >
          Saved
        </span>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Jot down ideas, links, thoughts..."
          className="ideas-editor flex-1 overflow-y-auto px-6 py-4 text-stone-300 text-sm leading-relaxed outline-none"
          onInput={triggerSave}
          onKeyDown={handleKeyDown}
          style={{ minHeight: 0 }}
        />
      </div>
    </div>
  )
}

function Btn({ onMouseDown, title, children }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onMouseDown() }}
      title={title}
      className="flex items-center justify-center px-2.5 py-1.5 text-stone-400 hover:text-amber-100/80 hover:bg-white/5 rounded transition-colors cursor-pointer select-none min-w-[2rem]"
    >
      {children}
    </button>
  )
}
