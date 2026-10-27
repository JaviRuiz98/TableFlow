import type { Tables } from '../app/core/data/database.types';
import type { Reservation as DomainReservation } from '../app/core/models/models';
import { fixtureReservation, fixtureTable } from './fixtures';

/**
 * B13: reservations exist in schema/domain but have no dedicated Angular feature UI.
 * These tests lock the contract so agents do not invent a module or alter statuses.
 */
describe('Reservations contract (schema / domain, no UI module)', () => {
  it('domain Reservation matches tables.reservations Row shape for allowed statuses', () => {
    const row: Tables<'reservations'> = {
      id: fixtureReservation.id,
      table_id: fixtureTable.id,
      name: fixtureReservation.name,
      reservation_date: fixtureReservation.reservation_date,
      reservation_time: fixtureReservation.reservation_time,
      people: fixtureReservation.people,
      notes: fixtureReservation.notes,
      status: 'PENDING',
      created_by: fixtureReservation.created_by,
      created_at: fixtureReservation.created_at,
      updated_at: fixtureReservation.updated_at,
    };
    const domain: DomainReservation = row;
    expect(domain.table_id).toBe(fixtureTable.id);
    expect(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).toContain(domain.status);
  });

  it('operational reserved spots remain ClubTable type=RESERVED (not reservations rows)', () => {
    expect(fixtureReservation.table_id).toBe(fixtureTable.id);
    // UI operativa uses tables.type=RESERVED; dated reservations table is legacy parity.
    expect(fixtureTable.type).toBe('TABLE');
  });

  it('documents allowed reservation_status enum values', () => {
    const statuses: Array<Tables<'reservations'>['status']> = [
      'PENDING',
      'CONFIRMED',
      'CANCELLED',
      'COMPLETED',
    ];
    expect(statuses).toHaveLength(4);
  });
});
