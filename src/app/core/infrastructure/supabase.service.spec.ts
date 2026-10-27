import { TestBed } from '@angular/core/testing';
import { SupabaseService } from './supabase.service';

describe('SupabaseService', () => {
  it('exposes a single root instance with one client', () => {
    TestBed.configureTestingModule({});
    const first = TestBed.inject(SupabaseService);
    const second = TestBed.inject(SupabaseService);

    expect(second).toBe(first);
    expect(first.client).toBeTruthy();
    expect(typeof first.configured).toBe('boolean');
  });
});
