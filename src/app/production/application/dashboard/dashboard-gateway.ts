import { InjectionToken } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { SpreadsheetFile } from '../../../shared/application/spreadsheet-file';
import {
  DashboardOverview,
  DashboardPeriod,
  FarmDashboard,
  SectorDashboard,
} from '../../domain/dashboard';

/**
 * Porta do painel, declarada na aplicação e implementada em `infrastructure` (feature 006). As contas, as
 * variações e os alertas vêm prontos do backend: o cliente só mostra.
 */
export interface DashboardGateway {
  getDashboardOverview(): Promise<Result<DashboardOverview>>;
  getSectorDashboard(sectorId: string, period: DashboardPeriod): Promise<Result<SectorDashboard>>;
  /** O painel da granja toda no período (feature 009). */
  getFarmDashboard(period: DashboardPeriod): Promise<Result<FarmDashboard>>;
  /** A planilha do painel do setor no período (feature 007). */
  exportSectorDashboard(sectorId: string, period: DashboardPeriod): Promise<Result<SpreadsheetFile>>;
  /** A planilha da granja toda no período (feature 009). */
  exportFarmDashboard(period: DashboardPeriod): Promise<Result<SpreadsheetFile>>;
}

export const DASHBOARD_GATEWAY = new InjectionToken<DashboardGateway>('DashboardGateway');
