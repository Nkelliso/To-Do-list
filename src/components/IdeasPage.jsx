import { useEffect, useRef, useState } from 'react'

export default function IdeasPage({ content, onChange }) {
  const debounceRef = useRef(null)
  const [saved, setSaved] = useState(false)

  const handleChange = (e) => {
    const val = e.target.value
    onChange(val)

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }, 500)
  }

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  return (
    <div className="flex flex-col flex-1 h-full relative" style={{ background: '#120f08' }}>
      {/* Saved indicator */}
      <div
        className="absolute top-3 right-4 text-xs text-green-600 transition-opacity duration-500 pointer-events-none select-none z-10"
        style={{ opacity: saved ? 1 : 0 }}
      >
        Saved
      </div>

      <textarea
        value={content}
        onChange={handleChange}
        placeholder="Jot down ideas, links, thoughts..."
        className="flex-1 w-full h-full resize-none bg-transparent text-stone-300 placeholder-stone-700 text-sm leading-relaxed p-6 outline-none"
        style={{ minHeight: 0 }}
        spellCheck
      />
    </div>
  )
}
