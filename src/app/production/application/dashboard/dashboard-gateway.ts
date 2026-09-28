import { InjectionToken } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { DashboardOverview, DashboardPeriod, SectorDashboard } from '../../domain/dashboard';

/**
 * Porta do painel, declarada na aplicação e implementada em `infrastructure` (feature 006). As contas, as
 * variações e os alertas vêm prontos do backend: o cliente só mostra.
 */
export interface DashboardGateway {
  getDashboardOverview(): Promise<Result<DashboardOverview>>;
  getSectorDashboard(sectorId: string, period: DashboardPeriod): Promise<Result<SectorDashboard>>;
}

export const DASHBOARD_GATEWAY = new InjectionToken<DashboardGateway>('DashboardGateway');
