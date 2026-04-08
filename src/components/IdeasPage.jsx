import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'

const FONT_SIZES = { small: 13, medium: 16, large: 20 }

const IdeasPage = forwardRef(function IdeasPage({ content, onChange }, ref) {
  const editorRef = useRef(null)
  const debounceRef = useRef(null)
  const [saved, setSaved] = useState(false)
  const initialized = useRef(false)
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('taskflow_ideas_fontsize')
    return saved && FONT_SIZES[saved] ? saved : 'medium'
  })

  const changeFontSize = (size) => {
    setFontSize(size)
    localStorage.setItem('taskflow_ideas_fontsize', size)
  }

  // Set HTML once on mount only
  useEffect(() => {
    if (editorRef.current && !initialized.current) {
      editorRef.current.innerHTML = content || ''
      initialized.current = true
    }
  })

  // Expose flush() so parent can force-save before switching tabs
  useImperativeHandle(ref, () => ({
    flush() {
      clearTimeout(debounceRef.current)
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
    }
  }))

  useEffect(() => () => clearTimeout(debounceRef.current), [])

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

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return

    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    const range = sel.getRangeAt(0)

    const node = range.startContainer

    // Find the closest block element that is a direct child of the editor,
    // OR the editor itself when text sits unwrapped (first line before any Enter).
    let lineEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
    while (lineEl && lineEl !== editorRef.current && lineEl.parentElement !== editorRef.current) {
      lineEl = lineEl.parentElement
    }

    // lineEl is either a block child of editor, or the editor itself (first line)
    const lineText = lineEl === editorRef.current
      ? (node.nodeType === Node.TEXT_NODE ? node.textContent : lineEl.textContent)
      : lineEl?.textContent ?? ''

    if (!lineText.startsWith('- ')) return

    e.preventDefault()

    if (lineText === '- ') {
      // Empty bullet → clear dash and exit bullet mode
      if (lineEl && lineEl !== editorRef.current) {
        const clearRange = document.createRange()
        clearRange.selectNodeContents(lineEl)
        sel.removeAllRanges()
        sel.addRange(clearRange)
        document.execCommand('delete')
      }
      document.execCommand('insertParagraph')
    } else {
      // Continue the bullet on next line
      document.execCommand('insertParagraph')
      document.execCommand('insertText', false, '- ')
    }
  }

  const fmt = (cmd, value) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value ?? null)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: '#30202c' }}>

      {/* ── Toolbar ── */}
      <div
        className="flex items-center gap-0.5 px-4 py-2 border-b border-green-900/30 flex-shrink-0"
        style={{ background: '#382834' }}
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
          <span className="text-base leading-none">A</span>
          <span className="text-[9px] align-super leading-none ml-px">+</span>
        </Btn>
        <Btn onMouseDown={() => fmt('fontSize', '2')} title="Smaller text">
          <span className="text-xs leading-none">A</span>
          <span className="text-[9px] align-super leading-none ml-px">−</span>
        </Btn>

        {/* Font size S/M/L — right-aligned */}
        <div className="ml-auto flex items-center gap-3">
          {[['small', 'S'], ['medium', 'M'], ['large', 'L']].map(([size, label]) => (
            <button
              key={size}
              onMouseDown={(e) => { e.preventDefault(); changeFontSize(size) }}
              title={`${size.charAt(0).toUpperCase() + size.slice(1)} text`}
              className={`text-xs cursor-pointer select-none transition-colors pb-px ${
                fontSize === size
                  ? 'text-amber-100/80 border-b border-amber-100/50'
                  : 'text-stone-600 hover:text-stone-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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
          style={{ minHeight: 0, fontSize: FONT_SIZES[fontSize] }}
        />
      </div>
    </div>
  )
})

export default IdeasPage

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
