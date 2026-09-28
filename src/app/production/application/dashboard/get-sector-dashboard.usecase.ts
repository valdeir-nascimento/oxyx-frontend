import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { DashboardPeriod, SectorDashboard } from '../../domain/dashboard';
import { DASHBOARD_GATEWAY } from './dashboard-gateway';

/** O painel de um setor num período (feature 006). */
@Injectable({ providedIn: 'root' })
export class GetSectorDashboardUseCase {
  private readonly gateway = inject(DASHBOARD_GATEWAY);

  execute(sectorId: string, period: DashboardPeriod): Promise<Result<SectorDashboard>> {
    return this.gateway.getSectorDashboard(sectorId, period);
  }
}
