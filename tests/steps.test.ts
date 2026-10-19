import { describe, expect, it } from 'vitest'
import { STEPS, isStepKey, neighbours, stepFromPath, stepPath, stromkreisPath } from '../app/utils/steps'

describe('steps', () => {
  it('knows its neighbours', () => {
    expect(neighbours('kopf')).toEqual({ prev: null, next: 'stromkreise' })
    expect(neighbours('stromkreise')).toEqual({ prev: 'kopf', next: 'abschluss' })
    expect(neighbours('abschluss')).toEqual({ prev: 'stromkreise', next: null })
  })
  it('validates keys and builds paths', () => {
    expect(isStepKey('abschluss')).toBe(true)
    expect(isStepKey('foo')).toBe(false)
    expect(stepPath('abc', 'kopf')).toBe('/protokoll/abc/kopf')
  })
  it('has exactly Kopf, Stromkreise and Abschluss', () => {
    expect(STEPS.map((s) => s.key)).toEqual(['kopf', 'stromkreise', 'abschluss'])
    expect(isStepKey('auftrag')).toBe(false)
    expect(isStepKey('pruefungen')).toBe(false)
  })
  it('derives the step from sub-routes', () => {
    expect(stepFromPath('/protokoll/abc/stromkreise')).toBe('stromkreise')
    expect(stepFromPath('/protokoll/abc/stromkreise/2')).toBe('stromkreise')
    expect(stepFromPath('/protokoll/abc')).toBeNull()
    expect(stepFromPath('/')).toBeNull()
    expect(stromkreisPath('abc', 3)).toBe('/protokoll/abc/stromkreise/3')
  })
})
