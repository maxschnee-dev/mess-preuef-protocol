import { describe, expect, it } from 'vitest'
import { createProtokoll } from '../app/utils/protokoll-store'
import { collectCompanies, collectMessgeraete, suggest, planFill } from '../app/utils/stammdaten'

type P = ReturnType<typeof createProtokoll>
function protokoll(opts: { ag?: Partial<P['auftraggeber']>, an?: Partial<P['auftragnehmer']>, geraete?: string[] }) {
  const p = createProtokoll()
  p.auftraggeber = { ...p.auftraggeber, ...opts.ag }
  p.auftragnehmer = { ...p.auftragnehmer, ...opts.an }
  p.messgeraete = opts.geraete ?? []
  return p
}

describe('collectCompanies', () => {
  it('takes Auftraggeber and Auftragnehmer with their address', () => {
    const p = protokoll({ ag: { name1: 'Muster AG', name2: 'Verwaltung', strasse: 'Bahnhofstr. 1', plzOrt: '3000 Bern' }, an: { name1: 'Elektro Huber' } })
    expect(collectCompanies([], [p])).toEqual([
      { name: 'Muster AG', name2: 'Verwaltung', strasse: 'Bahnhofstr. 1', plzOrt: '3000 Bern' },
      { name: 'Elektro Huber', name2: '', strasse: '', plzOrt: '' },
    ])
  })
  it('ignores blank names and dedupes case/whitespace-insensitively, newest address wins', () => {
    const a = protokoll({ ag: { name1: 'Muster AG', strasse: 'Alt 1' }, an: { name1: '  ' } })
    const b = protokoll({ ag: { name1: ' muster ag ', strasse: 'Neu 2' } })
    const r = collectCompanies([], [a, b])
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ name: 'muster ag', strasse: 'Neu 2' })
  })
  it('keeps existing entries (survive Protokoll deletion) and does not blank an address with an empty one', () => {
    const existing = [{ name: 'Muster AG', name2: '', strasse: 'Alt 1', plzOrt: '3000 Bern' }]
    const r = collectCompanies(existing, [protokoll({ ag: { name1: 'Muster AG' } })])
    expect(r).toEqual(existing)
    expect(collectCompanies(existing, [])).toEqual(existing)
  })
})

describe('collectMessgeraete', () => {
  it('merges names, trims, drops blanks, dedupes case-insensitively, keeps existing', () => {
    const r = collectMessgeraete([{ name: 'Fluke 1664' }], [protokoll({ geraete: [' fluke 1664', '', 'Metrel MI 3152'] })])
    expect(r).toEqual([{ name: 'Fluke 1664' }, { name: 'Metrel MI 3152' }])
  })
})

describe('suggest', () => {
  const list = [{ name: 'Elektro Huber' }, { name: 'Huber Bau' }, { name: 'Muster AG' }]
  it('is empty for an empty query', () => expect(suggest(list, '  ')).toEqual([]))
  it('lists prefix matches before contains matches, case-insensitive', () => {
    expect(suggest(list, 'hub').map((x) => x.name)).toEqual(['Huber Bau', 'Elektro Huber'])
  })
  it('does not suggest an entry identical to what is typed', () => {
    expect(suggest(list, 'muster ag')).toEqual([])
  })
})

describe('planFill', () => {
  const c = { name: 'Muster AG', name2: 'Verwaltung', strasse: 'Bahnhofstr. 1', plzOrt: '3000 Bern' }
  const leer = { art: 'Eigentümer', name1: 'Mus', name2: '', strasse: '', plzOrt: '' }
  it('fills empty target fields directly, sets Name 1', () => {
    expect(planFill(leer, c)).toEqual({ conflict: false, patch: { name1: 'Muster AG', name2: 'Verwaltung', strasse: 'Bahnhofstr. 1', plzOrt: '3000 Bern' } })
  })
  it('flags a conflict when a target field holds a different value', () => {
    expect(planFill({ ...leer, strasse: 'Andere Str. 9' }, c).conflict).toBe(true)
  })
  it('is no conflict when existing values are identical', () => {
    expect(planFill({ ...leer, strasse: 'bahnhofstr. 1' }, c).conflict).toBe(false)
  })
  it('never blanks a field the company has no value for', () => {
    const r = planFill({ ...leer, strasse: 'X 1' }, { ...c, strasse: '' })
    expect(r.conflict).toBe(false)
    expect(r.patch).not.toHaveProperty('strasse')
  })
})
