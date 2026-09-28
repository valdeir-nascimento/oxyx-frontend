import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { DashboardOverview } from '../../domain/dashboard';
import { DASHBOARD_GATEWAY } from './dashboard-gateway';

/** O cabeçalho do painel e as abas (feature 006). */
@Injectable({ providedIn: 'root' })
export class GetDashboardOverviewUseCase {
  private readonly gateway = inject(DASHBOARD_GATEWAY);

  execute(): Promise<Result<DashboardOverview>> {
    return this.gateway.getDashboardOverview();
  }
}
