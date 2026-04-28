'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useGroceries } from '@/db/hooks'
import { addGroceryItem, resetGroceries, toggleGroceryItem } from '@/db/operations'
import { cn } from '@/lib/cn'

export function ShopView() {
  const sections = useGroceries()
  const [resetOpen, setResetOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="space-y-4 pt-1">
      <h2 className="font-display text-xl font-semibold tracking-tight">
        <span className="rainbow-text">Grocery</span> list
      </h2>

      <div className="space-y-4">
        {sections.map((section) => (
          <section key={section.name}>
            <h3 className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
              {section.name}
            </h3>
            <ul className="glass-card p-2 space-y-1">
              {section.items.map((item) => (
                <li key={item.name}>
                  <button
                    onClick={() => toggleGroceryItem(section.name, item.name)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/4 text-left tap-target"
                  >
                    <span
                      className={cn(
                        'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all',
                        item.checked
                          ? 'rainbow-bright-fill border-transparent'
                          : 'border-white/25 bg-white/5'
                      )}
                    >
                      {item.checked && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span
                      className={cn(
                        'flex-1 text-sm',
                        item.checked ? 'text-white/40 line-through' : 'text-white/90'
                      )}
                    >
                      {item.name}
                    </span>
                    <span className="text-xs text-white/45 font-mono">
                      {item.qty}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={() => setAddOpen(true)}>
          Add item
        </Button>
        <Button variant="danger" onClick={() => setResetOpen(true)}>
          Reset all
        </Button>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset list?"
      >
        <p className="text-sm text-white/75 mb-4">
          Uncheck everything and restore the default list. Custom items added on
          top of the template will be removed.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setResetOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await resetGroceries()
              setResetOpen(false)
            }}
          >
            Reset
          </Button>
        </div>
      </Modal>

      <AddItemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        sections={sections.map((s) => s.name)}
      />
    </div>
  )
}

function AddItemModal({
  open,
  onClose,
  sections,
}: {
  open: boolean
  onClose: () => void
  sections: string[]
}) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [section, setSection] = useState(sections[0] ?? 'Custom')

  async function save() {
    if (!name.trim()) return
    await addGroceryItem(section, {
      name: name.trim(),
      qty: qty.trim() || '—',
      checked: false,
    })
    setName('')
    setQty('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add item">
      <div className="space-y-3">
        <label>
          <span className="block text-xs text-white/55 mb-1">Item name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md bg-white/8 border border-white/12 p-2.5 text-sm focus:outline-none focus:border-pink-400/50"
            placeholder="e.g. Avocado"
          />
        </label>
        <label>
          <span className="block text-xs text-white/55 mb-1">Qty (optional)</span>
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full rounded-md bg-white/8 border border-white/12 p-2.5 text-sm focus:outline-none focus:border-pink-400/50"
            placeholder="e.g. 4"
          />
        </label>
        <label>
          <span className="block text-xs text-white/55 mb-1">Section</span>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full rounded-md bg-white/8 border border-white/12 p-2.5 text-sm focus:outline-none focus:border-pink-400/50"
          >
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={save} className="w-full">
          Add
        </Button>
      </div>
    </Modal>
  )
}
