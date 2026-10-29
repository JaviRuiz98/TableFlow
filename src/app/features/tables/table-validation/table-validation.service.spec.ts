import { TestBed } from '@angular/core/testing';
import type { ClubTable } from '../../../core/models/models';
import { TableValidationService } from './table-validation.service';

describe('TableValidationService', () => {
  let s: TableValidationService;
  beforeEach(() => {
    s = TestBed.inject(TableValidationService);
  });

  it('rejects duplicate numbers within the same type only', () => {
    expect(
      s.validateUniqueNumbers([
        { number: 1, type: 'TABLE' },
        { number: 1, type: 'TABLE' },
      ] as ClubTable[]),
    ).toBe(false);
    expect(
      s.validateUniqueNumbers([
        { number: 1, type: 'TABLE' },
        { number: 1, type: 'RESERVED' },
      ] as ClubTable[]),
    ).toBe(true);
    expect(
      s.validateUniqueNumbers([
        { number: 1, type: 'TABLE' },
        { number: 2, type: 'TABLE' },
      ] as ClubTable[]),
    ).toBe(true);
  });

  it('clamps logical coordinates inside plan bounds', () => {
    expect(
      s.clampPosition({ x: -10, y: 900, width: 100, height: 100 } as ClubTable, 500, 500),
    ).toMatchObject({ x: 0, y: 400 });
  });

  it('allows edge positions and clamps overflow using width/height', () => {
    expect(
      s.clampPosition({ x: 0, y: 0, width: 50, height: 50 } as ClubTable, 200, 200),
    ).toMatchObject({ x: 0, y: 0 });
    expect(
      s.clampPosition({ x: 180, y: 180, width: 50, height: 50 } as ClubTable, 200, 200),
    ).toMatchObject({ x: 150, y: 150 });
  });
});
