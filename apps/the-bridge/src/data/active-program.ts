import type { CustomProgramDay, ProgramDay, Settings } from '@/types'
import { PROGRAM } from './program'
import { getExerciseDef } from './exercises'

/**
 * Returns the program array to use for scheduling. If the user has a
 * `customProgram` saved in settings, it overrides PROGRAM; otherwise the
 * default 7-day program is returned. Custom days store only exercise names
 * — full defs are looked up lazily so any catalog change flows through.
 */
export function resolveActiveProgram(settings: Settings): ProgramDay[] {
  const custom = settings.customProgram
  if (!custom || custom.length === 0) return PROGRAM
  return custom
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => ({
      index: d.index,
      name: d.name,
      focus: d.focus,
      isRest: d.isRest,
      exercises: d.exerciseNames.map((n) => getExerciseDef(n)),
    }))
}

/** Inverse: snapshot the default program into the editable shape. */
export function toCustomShape(program: ProgramDay[]): CustomProgramDay[] {
  return program.map((d) => ({
    index: d.index,
    name: d.name,
    focus: d.focus,
    isRest: d.isRest,
    exerciseNames: d.exercises.map((e) => e.name),
  }))
}
