import { Injectable, signal } from '@angular/core';

/** Shared commercial name for ADMIN shell header + settings. */
@Injectable({ providedIn: 'root' })
export class AdminCompanyContextService {
  readonly companyName = signal('TableFlow');
  readonly companyId = signal<string | null>(null);

  setCompany(id: string, name: string): void {
    this.companyId.set(id);
    this.companyName.set(name);
  }
}
