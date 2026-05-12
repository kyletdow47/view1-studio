import type { Supplement } from '@/types'

export const SUPPLEMENTS: Supplement[] = [
  {
    name: 'Creatine',
    dose: '5 g',
    time: 'Anytime',
    notes: 'Daily, ideally same time. With water or smoothie.',
    owned: true,
  },
  {
    name: 'Whey protein',
    dose: '1-2 scoops',
    time: 'Post-workout / smoothie',
    notes: 'Used in mid-morning smoothie',
    owned: false,
  },
  {
    name: 'Vitamin D3',
    dose: '2,000-4,000 IU',
    time: 'With breakfast',
    notes: 'Take with fat for absorption',
    owned: false,
  },
  {
    name: 'Omega-3 (EPA+DHA)',
    dose: '2-3 g',
    time: 'With dinner',
    notes: 'Look for at least 2g combined EPA+DHA per dose',
    owned: false,
  },
  {
    name: 'Cal-Mag-Zinc',
    dose: '1 dose',
    time: 'Before bed',
    notes: 'Better sleep, recovery',
    owned: true,
  },
  {
    name: "Lion's Mane",
    dose: 'per label',
    time: 'Morning',
    notes: 'Cognitive — not muscle-relevant',
    owned: true,
  },
]
