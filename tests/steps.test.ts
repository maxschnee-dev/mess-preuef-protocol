import { describe, expect, it } from 'vitest'
import { isStepKey, neighbours, stepPath } from '../app/utils/steps'

describe('steps', () => {
  it('knows its neighbours', () => {
    expect(neighbours('auftrag')).toEqual({ prev: null, next: 'pruefungen' })
    expect(neighbours('stromkreise')).toEqual({ prev: 'pruefungen', next: 'abschluss' })
    expect(neighbours('abschluss')).toEqual({ prev: 'stromkreise', next: null })
  })
  it('validates keys and builds paths', () => {
    expect(isStepKey('abschluss')).toBe(true)
    expect(isStepKey('foo')).toBe(false)
    expect(stepPath('abc', 'auftrag')).toBe('/protokoll/abc/auftrag')
  })
})
