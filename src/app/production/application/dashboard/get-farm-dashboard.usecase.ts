import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { DashboardPeriod, FarmDashboard } from '../../domain/dashboard';
import { DASHBOARD_GATEWAY } from './dashboard-gateway';

/** O painel da granja toda num período: os setores ativos somados (feature 009). */
@Injectable({ providedIn: 'root' })
export class GetFarmDashboardUseCase {
  private readonly gateway = inject(DASHBOARD_GATEWAY);

  execute(period: DashboardPeriod): Promise<Result<FarmDashboard>> {
    return this.gateway.getFarmDashboard(period);
  }
}
