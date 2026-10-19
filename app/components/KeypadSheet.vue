<script setup lang="ts">
import { grenzwertText, pruefeNetzspannung, pruefeFelder, isPruefFeldKey } from '~/utils/grenzwerte'
import type { Pruefung } from '~/utils/grenzwerte'
import { FELD_INFO, bereinige, feldKey, naechstesZiel, targetKey, tippe } from '~/utils/keypad'
import type { KeypadTarget, TastenKey } from '~/utils/keypad'
import { stromkreisPath } from '~/utils/steps'
import { updateStromkreis } from '~/utils/stromkreis'

/**
 * Keypad bottom sheet (#15) for every number in the app. Non-modal: the page stays visible and
 * scrollable above it. The value is a real <input inputmode="none">: no on-screen keyboard, but a
 * hardware keyboard types into it. Values are saved on every change; Weiter only moves on.
 */
const { selected, update, isLocked } = useProtokolle()
const { target, close } = useKeypad()
const route = useRoute()

const sheet = ref<HTMLElement | null>(null)
const feld = ref<HTMLInputElement | null>(null)
/** The next digit/comma replaces the value that was there when the field was opened. */
const ersetzen = ref(true)

const stromkreis = computed(() => {
  const t = target.value
  return t && t.kind !== 'netz' ? selected.value?.stromkreise.find((s) => s.id === t.id) : undefined
})
const info = computed(() => (target.value ? FELD_INFO[feldKey(target.value)] : null))

const wert = computed(() => {
  const t = target.value
  const p = selected.value
  if (!t || !p) return ''
  if (t.kind === 'netz') return p.netzspannung
  return (stromkreis.value?.[t.key] as string | undefined) ?? ''
})

const pruefung = computed<Pruefung | null>(() => {
  const t = target.value
  if (!t) return null
  if (t.kind === 'netz') return pruefeNetzspannung(wert.value)
  if (t.kind === 'messwert' && stromkreis.value && isPruefFeldKey(t.key)) return pruefeFelder(stromkreis.value)[t.key] ?? null
  return null
})
const hinweis = computed(() => {
  const t = target.value
  if (!t) return null
  if (t.kind === 'netz') return pruefeNetzspannung('0').boundary
  if (t.kind === 'messwert' && stromkreis.value && isPruefFeldKey(t.key)) return grenzwertText(stromkreis.value, t.key)
  return null
})
const verstoss = computed(() => !!pruefung.value && !pruefung.value.ok)

function setWert(text: string) {
  const t = target.value
  const p = selected.value
  if (!t || !p) return
  if (t.kind === 'netz') update(p.id, { netzspannung: text })
  else update(p.id, { stromkreise: updateStromkreis(p.stromkreise, t.id, { [t.key]: text }) })
}

// hardware keyboard / paste: sanitise, keep the caret sane
function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  const clean = bereinige(el.value)
  if (clean !== el.value) el.value = clean
  ersetzen.value = false
  setWert(clean)
}
function taste(k: TastenKey) {
  setWert(tippe(wert.value, k, ersetzen.value))
  ersetzen.value = false
  feld.value?.focus({ preventScroll: true })
}
function schnellwert(v: string) {
  setWert(v)
  weiter()
}

async function weiter() {
  const t = target.value
  const p = selected.value
  if (!t || !p) return
  const next = naechstesZiel(t, p.stromkreise.map((s) => s.id))
  if (!next) return close()
  // set the target first so the route watcher below sees a matching target after navigating
  target.value = next
  if (next.kind !== 'netz' && (t.kind === 'netz' || t.id !== next.id)) {
    const i = p.stromkreise.findIndex((s) => s.id === next.id)
    await navigateTo(stromkreisPath(p.id, i + 1))
  }
}

// Leaving the page of the edited field closes the keypad (Weiter updates the target before navigating).
watch(() => route.path, (path) => {
  const t = target.value
  const p = selected.value
  if (!t || !p) return
  if (t.kind === 'netz') return void (stepFromPathIs(path, 'abschluss') || close())
  const i = p.stromkreise.findIndex((s) => s.id === t.id)
  if (i < 0 || path !== stromkreisPath(p.id, i + 1)) close()
})
const stepFromPathIs = (path: string, step: string) => path.split('/')[3] === step

// edited Stromkreis deleted, or Protokoll locked: close
watch([stromkreis, isLocked], () => {
  const t = target.value
  if (t && ((t.kind !== 'netz' && !stromkreis.value) || isLocked.value)) close()
})

// reserve room under the page and bring the edited card into view
function layout(t: KeypadTarget | null) {
  const root = document.documentElement
  if (!t) return root.classList.remove('keypad-open')
  root.classList.add('keypad-open')
  root.style.setProperty('--keypad-h', `${sheet.value?.offsetHeight ?? 0}px`)
  document.querySelector(`[data-keypad="${CSS.escape(targetKey(t))}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}
watch(target, async (t, alt) => {
  if (t && targetKey(t) !== (alt ? targetKey(alt) : '')) ersetzen.value = true
  await nextTick()
  layout(t)
  if (t) {
    feld.value?.focus({ preventScroll: true })
    feld.value?.select()
  }
}, { flush: 'post' })
onBeforeUnmount(() => {
  close()
  document.documentElement.classList.remove('keypad-open')
})

const taetigkeit = computed(() => (info.value?.unit ? `${info.value.label} (${info.value.unit})` : info.value?.label))
const KEYS: { k: TastenKey; label: string; cls?: string }[] = [
  ...(['7', '8', '9'] as const).map((k) => ({ k, label: k })),
  { k: 'back', label: '⌫' },
  ...(['4', '5', '6'] as const).map((k) => ({ k, label: k })),
  ...(['1', '2', '3'] as const).map((k) => ({ k, label: k })),
  { k: '0', label: '0', cls: 'col-span-2' },
  { k: ',', label: ',' },
]
</script>

<template>
  <Transition
    enter-active-class="transition-transform duration-150 ease-out"
    leave-active-class="transition-transform duration-100 ease-in"
    enter-from-class="translate-y-full"
    leave-to-class="translate-y-full"
  >
    <div
      v-if="target && info"
      ref="sheet"
      role="dialog"
      aria-label="Zahleneingabe"
      class="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-md border-[3px] border-b-0 border-ink bg-white px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_0_rgba(29,29,29,0.15)]"
      @keydown.esc.prevent="close"
    >
      <div class="flex items-center gap-2">
        <div class="min-w-0 flex-1 leading-tight">
          <div class="truncate text-sm font-bold">{{ taetigkeit }}</div>
          <div class="truncate text-xs text-muted" :class="verstoss ? 'font-bold text-tl-red' : ''">
            {{ hinweis ? `Grenzwert ${hinweis}` : 'Kein Grenzwert' }}
          </div>
        </div>
        <button
          type="button"
          class="flex size-9 shrink-0 items-center justify-center rounded-sm border-2 border-ink bg-white text-lg font-bold"
          aria-label="Schliessen"
          @mousedown.prevent
          @click="close"
        >
          <UIcon name="i-lucide-x" class="size-5" />
        </button>
      </div>

      <div
        class="mt-1 flex items-baseline gap-2 rounded-sm border-[3px] px-3 py-0.5"
        :class="verstoss ? 'border-tl-red bg-tl-red-fill' : 'border-ink bg-white'"
      >
        <input
          ref="feld"
          :value="wert"
          type="text"
          inputmode="none"
          autofocus
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          enterkeyhint="next"
          placeholder="–"
          :aria-label="taetigkeit"
          class="min-w-0 flex-1 bg-transparent text-4xl font-bold leading-tight outline-none placeholder:text-muted"
          @input="onInput"
          @keydown.enter.prevent="weiter"
          @keydown.esc.prevent="close"
        >
        <span v-if="info.unit" class="shrink-0 text-xl font-semibold text-muted">{{ info.unit }}</span>
      </div>

      <div v-if="info.schnellwerte.length" class="mt-1 flex gap-1.5 overflow-x-auto py-0.5" aria-label="Schnellwerte">
        <button
          v-for="v in info.schnellwerte"
          :key="v"
          type="button"
          class="h-10 shrink-0 rounded-sm border-2 border-ink bg-tl-light-blue-fill px-3.5 text-base font-bold active:translate-y-px"
          @mousedown.prevent
          @click="schnellwert(v)"
        >
          {{ v }}{{ info.unit ? ` ${info.unit}` : '' }}
        </button>
      </div>

      <div class="mt-1.5 grid grid-cols-4 gap-1.5">
        <button
          v-for="key in KEYS"
          :key="key.k"
          type="button"
          class="h-14 rounded-sm border-2 border-ink text-2xl font-bold active:translate-y-px active:brightness-95"
          :class="[key.cls, key.k === 'back' ? 'bg-tl-grey-fill' : 'bg-white']"
          :aria-label="key.k === 'back' ? 'Löschen' : key.k === ',' ? 'Komma' : key.label"
          @mousedown.prevent
          @click="taste(key.k)"
        >
          {{ key.label }}
        </button>
        <button
          type="button"
          class="col-start-4 row-span-3 row-start-2 flex flex-col items-center justify-center gap-1 rounded-sm border-2 border-ink bg-tl-blue-fill text-lg font-bold active:translate-y-px active:brightness-95"
          @mousedown.prevent
          @click="weiter"
        >
          <UIcon name="i-lucide-arrow-right" class="size-6" />
          Weiter
        </button>
      </div>
    </div>
  </Transition>
</template>
