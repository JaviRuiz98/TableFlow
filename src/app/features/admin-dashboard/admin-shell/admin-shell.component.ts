import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, chevronDownOutline, gridOutline } from 'ionicons/icons';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { TABLEFLOW_DEFAULT_BRANDING } from '../../../core/branding';
import { AdminCompanyContextService } from '../admin-company-context.service';
import { AdminMetricsService } from '../admin-metrics.service';
import { ADMIN_NAV_ITEMS, prepareAdminNavClick } from './admin-shell-nav.util';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IonContent, IonIcon],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
})
export class AdminShellComponent implements OnInit {
  readonly branding = TABLEFLOW_DEFAULT_BRANDING;
  readonly userMenuOpen = signal(false);
  readonly companyName = this.companyCtx.companyName;
  readonly navItems = ADMIN_NAV_ITEMS;

  readonly adminLabel = computed(() => {
    const p = this.auth.profile();
    return p?.full_name?.trim() || p?.username || 'Administrador';
  });

  private readonly router = inject(Router);

  constructor(
    private readonly auth: AuthService,
    private readonly metrics: AdminMetricsService,
    private readonly companyCtx: AdminCompanyContextService,
  ) {
    addIcons({ logOutOutline, chevronDownOutline, gridOutline });
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeUserMenu());
  }

  ngOnInit(): void {
    void this.metrics.loadOverview();
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    if (this.userMenuOpen()) {
      this.userMenuOpen.set(false);
    }
  }

  /** Explicit navigation so mobile overflow-x / overlays cannot swallow routerLink taps. */
  goAdminSection(event: Event, path: string): void {
    prepareAdminNavClick(event);
    this.closeUserMenu();
    void this.router.navigateByUrl(path);
  }

  async logout(): Promise<void> {
    this.closeUserMenu();
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }

  openSala(): void {
    void this.router.navigateByUrl('/sala');
  }
}
