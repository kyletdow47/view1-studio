import type { ProgramDay } from '@/types'
import { EXERCISES } from './exercises'

const ex = (name: keyof typeof EXERCISES) => EXERCISES[name]

/**
 * 7-day cycle. Index 0 = Day 1 (the first day after settings.startDate).
 * The user's program starts Tuesday 2026-04-28; Day 1 = Legs (Quad).
 * Day 6 = Hike (active recovery, no logged exercises). Day 7 = full rest.
 */
export const PROGRAM: ProgramDay[] = [
  {
    index: 0,
    name: 'Legs — Quad',
    focus: 'Quad-focused leg session',
    isRest: false,
    exercises: [
      ex('Hack Squat'),
      ex('Leg Extension'),
      ex('Bulgarian Split Squat'),
      ex('Standing Calf Raise'),
    ],
  },
  {
    index: 1,
    name: 'Push',
    focus: 'Chest, shoulders, triceps',
    isRest: false,
    exercises: [
      ex('Plate-Loaded Chest Press'),
      ex('Smith Incline Press'),
      ex('Pec Deck'),
      ex('Lateral Raise'),
      ex('Tricep Pushdown'),
    ],
  },
  {
    index: 2,
    name: 'Pull',
    focus: 'Back, rear delts, biceps',
    isRest: false,
    exercises: [
      ex('Lat Pulldown (V-Bar)'),
      ex('Seated Cable Row'),
      ex('Reverse Pec Deck'),
      ex('EZ Bar Curl'),
      ex('Hammer Curl'),
    ],
  },
  {
    index: 3,
    name: 'Legs — Ham/Glute',
    focus: 'Hamstring & glute focused',
    isRest: false,
    exercises: [
      ex('Romanian Deadlift'),
      ex('Lying Leg Curl'),
      ex('Hip Thrust'),
      ex('Seated Calf Raise'),
    ],
  },
  {
    index: 4,
    name: 'Upper',
    focus: 'Full upper body, hypertrophy',
    isRest: false,
    exercises: [
      ex('Pull-up (Assisted if needed)'),
      ex('DB Bench Press'),
      ex('DB Row'),
      ex('DB Lateral Raise'),
      ex('DB Curl'),
      ex('Overhead Tricep Extension'),
    ],
  },
  {
    index: 5,
    name: 'Hike',
    focus: 'Active recovery — outdoor hike',
    isRest: true,
    exercises: [],
  },
  {
    index: 6,
    name: 'Rest',
    focus: 'Full rest day',
    isRest: true,
    exercises: [],
  },
]
