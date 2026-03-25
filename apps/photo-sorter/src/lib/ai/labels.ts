export type PhotoCategory =
  | 'portrait'
  | 'landscape'
  | 'event'
  | 'detail'
  | 'group'
  | 'candid'
  | 'other'

export interface LabelDefinition {
  label: string
  category: PhotoCategory
}

export const PHOTOGRAPHY_LABELS: LabelDefinition[] = [
  // Moments (event)
  { label: 'wedding ceremony', category: 'event' },
  { label: 'first dance', category: 'event' },
  { label: 'cake cutting', category: 'event' },
  { label: 'getting ready', category: 'event' },
  { label: 'bouquet toss', category: 'event' },
  { label: 'ring exchange', category: 'event' },
  { label: 'first kiss', category: 'event' },
  { label: 'wedding reception', category: 'event' },

  // Portrait
  { label: 'bride portrait', category: 'portrait' },
  { label: 'groom portrait', category: 'portrait' },
  { label: 'couple portrait', category: 'portrait' },
  { label: 'indoor lighting portrait', category: 'portrait' },

  // Group
  { label: 'family group photo', category: 'group' },
  { label: 'bridal party photo', category: 'group' },
  { label: 'large group celebration', category: 'group' },

  // Detail
  { label: 'detail shot', category: 'detail' },
  { label: 'table decoration', category: 'detail' },
  { label: 'floral arrangement', category: 'detail' },
  { label: 'wedding rings closeup', category: 'detail' },

  // Landscape / venue
  { label: 'venue exterior', category: 'landscape' },
  { label: 'venue interior', category: 'landscape' },
  { label: 'golden hour photography', category: 'landscape' },

  // Candid
  { label: 'candid moment', category: 'candid' },
  { label: 'emotional reaction', category: 'candid' },
  { label: 'spontaneous laughter', category: 'candid' },
  { label: 'flash photography', category: 'candid' },
]

export const LABEL_STRINGS: string[] = PHOTOGRAPHY_LABELS.map((l) => l.label)

export function getCategoryForLabel(label: string): PhotoCategory {
  return PHOTOGRAPHY_LABELS.find((l) => l.label === label)?.category ?? 'other'
}
