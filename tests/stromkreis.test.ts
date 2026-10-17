import { describe, expect, it } from 'vitest'
import { addStromkreis, copyPrevious, moveStromkreis, removeStromkreis, updateStromkreis } from '../app/utils/stromkreis'

function three() {
  return addStromkreis(addStromkreis(addStromkreis([])))
}

describe('addStromkreis', () => {
  it('appends an empty Stromkreis with the next Nr.', () => {
    const one = addStromkreis([])
    const two = addStromkreis(one)
    expect(two).toHaveLength(2)
    expect(two[0]!.nr).toBe('1')
    expect(two[1]!.nr).toBe('2')
    expect(two[1]!.id).not.toBe(two[0]!.id)
    expect(two[1]).toMatchObject({
      bezeichnung: '', ueberstromschutzArt: '', rcdArt: '', schutzleiter: '', rIso: '', ikAnfang: '', ikEnde: '', ausloesezeit: '',
    })
  })

  it('does not mutate the input list', () => {
    const list = addStromkreis([])
    addStromkreis(list)
    expect(list).toHaveLength(1)
  })
})

describe('updateStromkreis', () => {
  it('patches only the addressed Stromkreis', () => {
    const list = three()
    const next = updateStromkreis(list, list[1]!.id, { rIso: '250' })
    expect(next[1]!.rIso).toBe('250')
    expect(next[0]!.rIso).toBe('')
    expect(list[1]!.rIso).toBe('')
  })
})

describe('removeStromkreis', () => {
  it('deletes the addressed Stromkreis', () => {
    const list = three()
    const next = removeStromkreis(list, list[1]!.id)
    expect(next.map((s) => s.nr)).toEqual(['1', '3'])
  })
})

describe('moveStromkreis', () => {
  it('moves up and down', () => {
    const list = three()
    expect(moveStromkreis(list, list[1]!.id, -1).map((s) => s.nr)).toEqual(['2', '1', '3'])
    expect(moveStromkreis(list, list[1]!.id, 1).map((s) => s.nr)).toEqual(['1', '3', '2'])
  })
  it('ignores moves past the ends', () => {
    const list = three()
    expect(moveStromkreis(list, list[0]!.id, -1).map((s) => s.nr)).toEqual(['1', '2', '3'])
    expect(moveStromkreis(list, list[2]!.id, 1).map((s) => s.nr)).toEqual(['1', '2', '3'])
  })
})

describe('copyPrevious', () => {
  it('copies Stammdaten of the last Stromkreis but not Messwerte', () => {
    let list = addStromkreis([])
    list = updateStromkreis(list, list[0]!.id, {
      bezeichnung: 'Steckdosen Küche', leitungArtTyp: 'NYM', leiterAnzahl: '3', leiterQuerschnitt: '1.5',
      ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '16', rcdIn: '40', rcdArt: 'A', rcdIdn: '30',
      schutzleiter: '0.2', rIso: '500', iLeck: '0.1', ikAnfang: '300', ikEnde: '260', ausloesezeit: '20',
    })
    const next = copyPrevious(list)
    const copy = next[1]!
    expect(next).toHaveLength(2)
    expect(copy.id).not.toBe(list[0]!.id)
    expect(copy.nr).toBe('2')
    expect(copy).toMatchObject({
      bezeichnung: 'Steckdosen Küche', leitungArtTyp: 'NYM', leiterAnzahl: '3', leiterQuerschnitt: '1.5',
      ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '16', rcdIn: '40', rcdArt: 'A', rcdIdn: '30',
    })
    expect(copy).toMatchObject({ schutzleiter: '', rIso: '', iLeck: '', ikAnfang: '', ikEnde: '', ausloesezeit: '' })
  })
  it('adds an empty Stromkreis when there is none to copy', () => {
    expect(copyPrevious([])).toHaveLength(1)
  })
})
