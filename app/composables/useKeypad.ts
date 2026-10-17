import type { KeypadTarget } from '~/utils/keypad'

/** Shared state of the keypad bottom sheet (#15): which field is being edited, `null` = closed. */
export function useKeypad() {
  const target = useState<KeypadTarget | null>('keypad-target', () => null)
  const { isLocked } = useProtokolle()
  return {
    target,
    /** Opens the keypad for a field; never on a locked Protokoll. */
    open(t: KeypadTarget) {
      if (!isLocked.value) target.value = t
    },
    close() {
      target.value = null
    },
  }
}
