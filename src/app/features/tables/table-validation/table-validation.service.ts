import { Injectable } from '@angular/core';
import type { ClubTable } from '../../../core/models/models';

/** Pure table/reserved validation helpers (no I/O). */
@Injectable({ providedIn: 'root' })
export class TableValidationService {
  /** Unique numbers within each type (TABLE / RESERVED are independent). */
  validateUniqueNumbers(tables: ClubTable[]): boolean {
    const byType = new Map<string, Set<number>>();
    for (const row of tables) {
      const key = row.type ?? 'TABLE';
      let used = byType.get(key);
      if (!used) {
        used = new Set();
        byType.set(key, used);
      }
      if (used.has(row.number)) return false;
      used.add(row.number);
    }
    return true;
  }

  clampPosition(table: ClubTable, width: number, height: number): ClubTable {
    return {
      ...table,
      x: Math.max(0, Math.min(table.x, width - table.width)),
      y: Math.max(0, Math.min(table.y, height - table.height)),
    };
  }
}
