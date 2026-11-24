import { describe, expect, it } from 'vitest'
import { parseStudentLines } from './bulkParse'

describe('parseStudentLines', () => {
  it('lit le point-virgule, la tabulation, puis le premier espace', () => {
    expect(parseStudentLines('Mame Diarra ; Bousso\nNdèye\tMbaye Fall\n  Khadija   Ba  \n\nCheikh')).toEqual([
      { firstName: 'Mame Diarra', lastName: 'Bousso' },
      { firstName: 'Ndèye', lastName: 'Mbaye Fall' },
      { firstName: 'Khadija', lastName: 'Ba' },
      { firstName: 'Cheikh', lastName: '' },
    ])
  })

  it('ignore les lignes vides', () => {
    expect(parseStudentLines('\n  \r\n')).toEqual([])
  })
})
