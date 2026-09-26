import { InjectionToken } from '@angular/core';
import { Result } from '../../../shared/application/result';
import {
  DailyReport,
  DailyReportInput,
  DailyReportPage,
  DailyReportSearch,
  DailyReportSuggestion,
  MortalityInput,
  ProductionInput,
  ReportCage,
} from '../../domain/daily-report';

/**
 * Porta dos relatórios diários, declarada na aplicação e implementada em `infrastructure`. O relatório
 * é recurso do setor: toda operação leva o setor dele.
 */
export interface DailyReportGateway {
  listDailyReports(sectorId: string, search: DailyReportSearch): Promise<Result<DailyReportPage>>;
  suggestDailyReport(sectorId: string): Promise<Result<DailyReportSuggestion>>;
  openDailyReport(sectorId: string, input: DailyReportInput): Promise<Result<DailyReport>>;
  correctDailyReport(sectorId: string, reportId: string, input: DailyReportInput): Promise<Result<DailyReport>>;
  findDailyReport(sectorId: string, reportId: string): Promise<Result<DailyReport>>;
  findReportCage(sectorId: string, reportId: string, cageId: string): Promise<Result<ReportCage>>;
  recordProduction(
    sectorId: string,
    reportId: string,
    cageId: string,
    input: ProductionInput,
  ): Promise<Result<ReportCage>>;
  recordMortality(
    sectorId: string,
    reportId: string,
    cageId: string,
    input: MortalityInput,
  ): Promise<Result<ReportCage>>;
  confirmNoMortality(sectorId: string, reportId: string): Promise<Result<DailyReport>>;
}

export const DAILY_REPORT_GATEWAY = new InjectionToken<DailyReportGateway>('DailyReportGateway');
