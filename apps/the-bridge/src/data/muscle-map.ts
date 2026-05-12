import type { Muscle } from '@/types'

/**
 * Maps every exercise to the muscles it works. Primary = the prime mover(s)
 * counted at 1.0× volume; secondary = synergists counted at 0.5×.
 *
 * Keep names exactly in sync with the keys in `EXERCISES`. New exercises must
 * be added here too or they fall back to the category-based default in
 * `getMuscles`.
 */
export const MUSCLE_MAP: Record<
  string,
  { primary: Muscle[]; secondary?: Muscle[] }
> = {
  // ---------- Quads ----------
  'Hack Squat': { primary: ['Quads'], secondary: ['Glutes'] },
  'Leg Press': { primary: ['Quads'], secondary: ['Glutes', 'Hamstrings'] },
  'Front Squat': {
    primary: ['Quads'],
    secondary: ['Glutes', 'Upper Back', 'Abs'],
  },
  'Leg Extension': { primary: ['Quads'] },
  'Bulgarian Split Squat': {
    primary: ['Quads'],
    secondary: ['Glutes', 'Hamstrings'],
  },
  'Walking Lunge': {
    primary: ['Quads'],
    secondary: ['Glutes', 'Hamstrings'],
  },
  'Goblet Squat': { primary: ['Quads'], secondary: ['Glutes'] },

  // ---------- Hamstrings / Glutes ----------
  'Romanian Deadlift': {
    primary: ['Hamstrings', 'Glutes'],
    secondary: ['Lower Back', 'Forearms'],
  },
  'Stiff-Leg Deadlift': {
    primary: ['Hamstrings'],
    secondary: ['Glutes', 'Lower Back'],
  },
  'Lying Leg Curl': { primary: ['Hamstrings'] },
  'Seated Leg Curl': { primary: ['Hamstrings'] },
  'Hip Thrust': { primary: ['Glutes'], secondary: ['Hamstrings'] },
  'Cable Pull-Through': { primary: ['Glutes'], secondary: ['Hamstrings'] },

  // ---------- Calves ----------
  'Standing Calf Raise': { primary: ['Calves'] },
  'Seated Calf Raise': { primary: ['Calves'] },

  // ---------- Chest ----------
  'Plate-Loaded Chest Press': {
    primary: ['Chest'],
    secondary: ['Front Delts', 'Triceps'],
  },
  'Smith Incline Press': {
    primary: ['Chest', 'Front Delts'],
    secondary: ['Triceps'],
  },
  'DB Bench Press': {
    primary: ['Chest'],
    secondary: ['Front Delts', 'Triceps'],
  },
  'DB Incline Press': {
    primary: ['Chest', 'Front Delts'],
    secondary: ['Triceps'],
  },
  'Pec Deck': { primary: ['Chest'] },
  'Cable Fly': { primary: ['Chest'] },
  Dip: { primary: ['Chest'], secondary: ['Triceps', 'Front Delts'] },
  'Push-Up': {
    primary: ['Chest'],
    secondary: ['Triceps', 'Front Delts', 'Abs'],
  },

  // ---------- Back ----------
  'Lat Pulldown (V-Bar)': {
    primary: ['Lats'],
    secondary: ['Biceps', 'Upper Back', 'Rear Delts'],
  },
  'Wide-Grip Lat Pulldown': {
    primary: ['Lats'],
    secondary: ['Upper Back', 'Biceps'],
  },
  'Seated Cable Row': {
    primary: ['Upper Back', 'Lats'],
    secondary: ['Biceps', 'Rear Delts'],
  },
  'DB Row': {
    primary: ['Lats', 'Upper Back'],
    secondary: ['Biceps', 'Rear Delts'],
  },
  'T-Bar Row': {
    primary: ['Upper Back', 'Lats'],
    secondary: ['Biceps', 'Rear Delts', 'Lower Back'],
  },
  'Pull-up (Assisted if needed)': {
    primary: ['Lats'],
    secondary: ['Biceps', 'Upper Back'],
  },
  'Chin-Up': {
    primary: ['Lats', 'Biceps'],
    secondary: ['Upper Back'],
  },
  'Face Pull': {
    primary: ['Rear Delts'],
    secondary: ['Upper Back', 'Traps'],
  },
  'Reverse Pec Deck': {
    primary: ['Rear Delts'],
    secondary: ['Upper Back'],
  },

  // ---------- Shoulders ----------
  'Lateral Raise': { primary: ['Side Delts'] },
  'DB Lateral Raise': { primary: ['Side Delts'] },
  'Cable Lateral Raise': { primary: ['Side Delts'] },
  'Overhead Press (Barbell)': {
    primary: ['Front Delts'],
    secondary: ['Side Delts', 'Triceps', 'Upper Back'],
  },
  'DB Shoulder Press': {
    primary: ['Front Delts'],
    secondary: ['Side Delts', 'Triceps'],
  },

  // ---------- Biceps ----------
  'EZ Bar Curl': { primary: ['Biceps'], secondary: ['Forearms'] },
  'Hammer Curl': { primary: ['Biceps', 'Forearms'] },
  'DB Curl': { primary: ['Biceps'], secondary: ['Forearms'] },
  'Cable Curl': { primary: ['Biceps'], secondary: ['Forearms'] },
  'Preacher Curl': { primary: ['Biceps'], secondary: ['Forearms'] },
  'Waiter Curl': { primary: ['Biceps'], secondary: ['Forearms'] },

  // ---------- Triceps ----------
  'Tricep Pushdown': { primary: ['Triceps'] },
  'Overhead Tricep Extension': { primary: ['Triceps'] },
  Skullcrusher: { primary: ['Triceps'] },
  'Close-Grip Bench Press': {
    primary: ['Triceps'],
    secondary: ['Chest', 'Front Delts'],
  },

  // ---------- Core ----------
  'Hanging Leg Raise': { primary: ['Abs'], secondary: ['Forearms', 'Obliques'] },
  'Cable Crunch': { primary: ['Abs'] },
  Plank: { primary: ['Abs'], secondary: ['Obliques'] },
  'Ab Wheel Rollout': { primary: ['Abs'], secondary: ['Lats'] },
  'Russian Twist': { primary: ['Obliques'], secondary: ['Abs'] },
  'Side Plank': { primary: ['Obliques'], secondary: ['Abs'] },
  'Pallof Press': { primary: ['Obliques'], secondary: ['Abs'] },
  'Cable Wood Chop': { primary: ['Obliques'], secondary: ['Abs'] },
  'Hanging Side-to-Side Leg Raise': {
    primary: ['Obliques', 'Abs'],
    secondary: ['Forearms'],
  },

  // Lower Back
  'Back Extension': {
    primary: ['Lower Back'],
    secondary: ['Glutes', 'Hamstrings'],
  },
  'Reverse Hyperextension': {
    primary: ['Lower Back', 'Glutes'],
    secondary: ['Hamstrings'],
  },
  'Good Morning': {
    primary: ['Hamstrings', 'Lower Back'],
    secondary: ['Glutes'],
  },
  'Bird Dog': { primary: ['Lower Back'], secondary: ['Glutes', 'Abs'] },
  'Superman Hold': { primary: ['Lower Back'], secondary: ['Glutes'] },

  // ---------- Cardio (count primary as Quads — the dominant mover for most cardio) ----------
  'Stair Climber': { primary: ['Quads'], secondary: ['Glutes', 'Calves'] },
  'Treadmill (Incline Walk)': {
    primary: ['Quads', 'Calves'],
    secondary: ['Glutes'],
  },
  'Treadmill (Run)': {
    primary: ['Quads', 'Calves'],
    secondary: ['Hamstrings', 'Glutes'],
  },
  'Stationary Bike': { primary: ['Quads'], secondary: ['Glutes', 'Calves'] },
  Elliptical: {
    primary: ['Quads', 'Glutes'],
    secondary: ['Hamstrings', 'Calves'],
  },
  'Rowing Machine': {
    primary: ['Upper Back', 'Lats', 'Quads'],
    secondary: ['Biceps', 'Glutes', 'Hamstrings'],
  },
  'Jump Rope': { primary: ['Calves'], secondary: ['Forearms', 'Quads'] },

  // ---------- Other ----------
  'Farmer’s Carry': {
    primary: ['Forearms', 'Traps'],
    secondary: ['Abs', 'Upper Back'],
  },
  'Sled Push': {
    primary: ['Quads', 'Glutes'],
    secondary: ['Calves', 'Abs'],
  },
}

/** Sensible fallback: derive muscles from the loose category for unknown lifts. */
const CATEGORY_FALLBACK: Record<string, { primary: Muscle[]; secondary: Muscle[] }> = {
  Quads: { primary: ['Quads'], secondary: ['Glutes'] },
  'Hamstrings/Glutes': { primary: ['Hamstrings', 'Glutes'], secondary: [] },
  Calves: { primary: ['Calves'], secondary: [] },
  Chest: { primary: ['Chest'], secondary: ['Triceps', 'Front Delts'] },
  Back: { primary: ['Lats', 'Upper Back'], secondary: ['Biceps'] },
  Shoulders: { primary: ['Front Delts', 'Side Delts'], secondary: [] },
  Biceps: { primary: ['Biceps'], secondary: ['Forearms'] },
  Triceps: { primary: ['Triceps'], secondary: [] },
  Core: { primary: ['Abs'], secondary: ['Obliques'] },
  Cardio: { primary: ['Quads'], secondary: ['Glutes', 'Calves'] },
  Other: { primary: [], secondary: [] },
}

export function getMuscles(
  exerciseName: string,
  fallbackCategory?: string
): { primary: Muscle[]; secondary: Muscle[] } {
  const direct = MUSCLE_MAP[exerciseName]
  if (direct) return { primary: direct.primary, secondary: direct.secondary ?? [] }
  if (fallbackCategory && CATEGORY_FALLBACK[fallbackCategory]) {
    return CATEGORY_FALLBACK[fallbackCategory]
  }
  return { primary: [], secondary: [] }
}
