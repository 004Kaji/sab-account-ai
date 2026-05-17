'use client'

import React, { useEffect, useRef, useState } from 'react'

export interface AutocompleteItem {
  id: string
  label: string
  sublabel?: string
}

interface Props {
  label: React.ReactNode
  placeholder: string
  items: AutocompleteItem[]
  value: string
  onSelect: (item: AutocompleteItem) => void
  onClear: () => void
  onAddNew: () => void
  addNewLabel?: string
}

export default function AutocompleteDropdown({
  label, placeholder, items, value, onSelect, onClear, onAddNew, addNewLabel = 'Add new',
}: Props) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = query.trim()
    ? items.filter(it =>
        it.label.toLowerCase().includes(query.toLowerCase()) ||
        it.sublabel?.toLowerCase().includes(query.toLowerCase()))
    : items

  const totalOptions = filtered.length + 1 // +1 for "Add new"

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) { if (e.key === 'ArrowDown') setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, totalOptions - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)) }
    if (e.key === 'Escape')    { setOpen(false); setHighlighted(-1) }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (highlighted >= 0 && highlighted < filtered.length) {
        pick(filtered[highlighted])
      } else if (highlighted === filtered.length) {
        onAddNew(); setOpen(false)
      }
    }
  }

  function pick(item: AutocompleteItem) {
    setQuery(item.label)
    setOpen(false)
    setHighlighted(-1)
    onSelect(item)
  }

  function clear() {
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
    onClear()
  }

  const isSelected = items.some(it => it.label === query && query !== '')

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label className="sab-label">{label}</label>
      <div style={{ position: 'relative' }}>
        {isSelected && (
          <span style={{
            position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)',
            width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ember)',
            zIndex: 1, pointerEvents: 'none',
          }} />
        )}
        <input
          ref={inputRef}
          className="sab-input"
          placeholder={placeholder}
          value={query}
          style={{ paddingLeft: isSelected ? '1.375rem' : undefined, paddingRight: query ? '1.75rem' : undefined }}
          onChange={e => { setQuery(e.target.value); setOpen(true); setHighlighted(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {query && (
          <button
            onClick={clear}
            tabIndex={-1}
            style={{
              position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)',
              fontSize: '1rem', lineHeight: 1, padding: '0.125rem',
            }}
          >×</button>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200,
          maxHeight: '240px', overflowY: 'auto',
        }}>
          {filtered.length === 0 && query.trim() && (
            <p style={{ padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: 'var(--text3)' }}>
              No matches for &ldquo;{query}&rdquo;
            </p>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              onMouseDown={e => { e.preventDefault(); pick(item) }}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                width: '100%', padding: '0.625rem 0.875rem', fontSize: '0.875rem',
                background: highlighted === i ? 'var(--cream)' : 'transparent',
                color: 'var(--char)', border: 'none', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontWeight: 500 }}>{item.label}</span>
              {item.sublabel && <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{item.sublabel}</span>}
            </button>
          ))}
          <button
            onMouseDown={e => { e.preventDefault(); onAddNew(); setOpen(false) }}
            onMouseEnter={() => setHighlighted(filtered.length)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              width: '100%', padding: '0.625rem 0.875rem', fontSize: '0.8125rem',
              background: highlighted === filtered.length ? 'var(--cream)' : 'transparent',
              color: 'var(--ember)', border: 'none', cursor: 'pointer', fontWeight: 500,
            }}
          >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
            {addNewLabel}
          </button>
        </div>
      )}
    </div>
  )
}
