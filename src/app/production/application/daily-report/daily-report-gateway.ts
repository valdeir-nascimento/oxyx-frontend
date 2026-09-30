import { InjectionToken } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { SpreadsheetFile } from '../../../shared/application/spreadsheet-file';
import {
  DailyReport,
  DailyReportInput,
  DailyReportPage,
  DailyReportSearch,
  DailyReportSuggestion,
  FeedFormulaOption,
  FeedInput,
  FeedSuggestion,
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
  /** As fórmulas ativas, que o lançamento de ração oferece (feature 004). */
  listActiveFormulas(): Promise<Result<readonly FeedFormulaOption[]>>;
  suggestFeed(sectorId: string, reportId: string, formulaId: string): Promise<Result<FeedSuggestion>>;
  recordFeedBySuggestion(sectorId: string, reportId: string, formulaId: string): Promise<Result<DailyReport>>;
  recordFeed(sectorId: string, reportId: string, cageId: string, input: FeedInput): Promise<Result<ReportCage>>;
  /** A planilha dos relatórios do setor entre as duas datas, inclusive (feature 007). */
  exportDailyReports(sectorId: string, from: string, to: string): Promise<Result<SpreadsheetFile>>;
}

export const DAILY_REPORT_GATEWAY = new InjectionToken<DailyReportGateway>('DailyReportGateway');
