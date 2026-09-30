import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Result, success } from '../../shared/application/result';
import { fileResultOf, resultOf } from '../../shared/infrastructure/http-result';
import { SpreadsheetFile } from '../../shared/application/spreadsheet-file';
import { jsonNumberOf } from '../../shared/infrastructure/typed-number';
import { DailyReportGateway } from '../application/daily-report/daily-report-gateway';
import { DashboardGateway } from '../application/dashboard/dashboard-gateway';
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
} from '../domain/daily-report';
import { DashboardOverview, DashboardPeriod, SectorDashboard } from '../domain/dashboard';

/**
 * Endereço dos relatórios de um setor, e de um deles, com os identificadores codificados: eles vêm do
 * endereço da tela, e o navegador resolve os `..` de um caminho.
 */
function reportsUrl(sectorId: string, reportId?: string): string {
  const reports = `/api/v1/sectors/${encodeURIComponent(sectorId)}/daily-reports`;
  return reportId === undefined ? reports : `${reports}/${encodeURIComponent(reportId)}`;
}

/** As fórmulas de ração, no farm (feature 004). */
const FORMULAS = '/api/v1/feed-formulas';

/** Endereço de uma gaiola do relatório, com o identificador dela também codificado. */
function cageUrl(sectorId: string, reportId: string, cageId: string): string {
  return `${reportsUrl(sectorId, reportId)}/cages/${encodeURIComponent(cageId)}`;
}

/** O corpo do lançamento de produção: as quantidades como números; a classificação em branco, ausente. */
function productionBodyOf(input: ProductionInput): Record<string, unknown> {
  return {
    eggs: jsonNumberOf(input.eggs),
    small: jsonNumberOf(input.small),
    jumbo: jsonNumberOf(input.jumbo),
    dirty: jsonNumberOf(input.dirty),
    cracked: jsonNumberOf(input.cracked),
    bloodSpot: jsonNumberOf(input.bloodSpot),
    abnormal: jsonNumberOf(input.abnormal),
  };
}

/** O corpo da abertura e da correção: as quantidades como números, quando são, e o resto como veio. */
function reportBodyOf(input: DailyReportInput): Record<string, unknown> {
  return {
    collectionDate: input.collectionDate,
    collectionTime: input.collectionTime,
    openingBirdCount: jsonNumberOf(input.openingBirdCount),
    flockAge: jsonNumberOf(input.flockAge),
    note: input.note,
  };
}

/**
 * Implementação da porta do contexto production sobre HTTP (contracts/production-api.yaml).
 *
 * É o único lugar do contexto que conhece `HttpClient`, caminho de endpoint e formato de erro. Toda
 * recusa vira `Result`, nunca exceção, por `resultOf`.
 */
@Injectable({ providedIn: 'root' })
export class ProductionHttpAdapter implements DailyReportGateway, DashboardGateway {
  private readonly http = inject(HttpClient);

  async listDailyReports(sectorId: string, search: DailyReportSearch): Promise<Result<DailyReportPage>> {
    let params = new HttpParams().set('page', search.page).set('size', search.size);
    if (search.collectionDate) {
      params = params.set('collectionDate', search.collectionDate);
    }
    return resultOf(() => firstValueFrom(this.http.get<DailyReportPage>(reportsUrl(sectorId), { params })));
  }

  async suggestDailyReport(sectorId: string): Promise<Result<DailyReportSuggestion>> {
    return resultOf(() => firstValueFrom(this.http.get<DailyReportSuggestion>(`${reportsUrl(sectorId)}/suggestion`)));
  }

  async openDailyReport(sectorId: string, input: DailyReportInput): Promise<Result<DailyReport>> {
    return resultOf(() => firstValueFrom(this.http.post<DailyReport>(reportsUrl(sectorId), reportBodyOf(input))));
  }

  async correctDailyReport(sectorId: string, reportId: string, input: DailyReportInput): Promise<Result<DailyReport>> {
    return resultOf(() =>
      firstValueFrom(this.http.put<DailyReport>(reportsUrl(sectorId, reportId), reportBodyOf(input))),
    );
  }

  async findDailyReport(sectorId: string, reportId: string): Promise<Result<DailyReport>> {
    return resultOf(() => firstValueFrom(this.http.get<DailyReport>(reportsUrl(sectorId, reportId))));
  }

  async findReportCage(sectorId: string, reportId: string, cageId: string): Promise<Result<ReportCage>> {
    return resultOf(() => firstValueFrom(this.http.get<ReportCage>(cageUrl(sectorId, reportId, cageId))));
  }

  async recordProduction(
    sectorId: string,
    reportId: string,
    cageId: string,
    input: ProductionInput,
  ): Promise<Result<ReportCage>> {
    return resultOf(() =>
      firstValueFrom(
        this.http.put<ReportCage>(`${cageUrl(sectorId, reportId, cageId)}/production`, productionBodyOf(input)),
      ),
    );
  }

  async recordMortality(
    sectorId: string,
    reportId: string,
    cageId: string,
    input: MortalityInput,
  ): Promise<Result<ReportCage>> {
    const body = { deaths: jsonNumberOf(input.deaths), culls: jsonNumberOf(input.culls), note: input.note };
    return resultOf(() =>
      firstValueFrom(this.http.put<ReportCage>(`${cageUrl(sectorId, reportId, cageId)}/mortality`, body)),
    );
  }

  async confirmNoMortality(sectorId: string, reportId: string): Promise<Result<DailyReport>> {
    return resultOf(() =>
      firstValueFrom(this.http.post<DailyReport>(`${reportsUrl(sectorId, reportId)}/mortality-confirmation`, null)),
    );
  }

  async listActiveFormulas(): Promise<Result<readonly FeedFormulaOption[]>> {
    // As fórmulas são do farm: o production as lê pela API delas, e só o que o lançamento precisa, como o
    // FeedCatalog do backend (R-004 da 004).
    const params = new HttpParams().set('status', 'ACTIVE');
    const result = await resultOf(() => firstValueFrom(this.http.get<FeedFormulaOption[]>(FORMULAS, { params })));
    return result.success
      ? success(
          result.value.map(({ id, name, pricePerKg, expectedIntake }) => ({ id, name, pricePerKg, expectedIntake })),
        )
      : result;
  }

  async suggestFeed(sectorId: string, reportId: string, formulaId: string): Promise<Result<FeedSuggestion>> {
    const params = new HttpParams().set('formulaId', formulaId);
    return resultOf(() =>
      firstValueFrom(this.http.get<FeedSuggestion>(`${reportsUrl(sectorId, reportId)}/feed-suggestion`, { params })),
    );
  }

  async recordFeedBySuggestion(sectorId: string, reportId: string, formulaId: string): Promise<Result<DailyReport>> {
    return resultOf(() =>
      firstValueFrom(this.http.post<DailyReport>(`${reportsUrl(sectorId, reportId)}/feed`, { formulaId })),
    );
  }

  async recordFeed(
    sectorId: string,
    reportId: string,
    cageId: string,
    input: FeedInput,
  ): Promise<Result<ReportCage>> {
    const body = { formulaId: input.formulaId, consumption: jsonNumberOf(input.consumption) };
    return resultOf(() =>
      firstValueFrom(this.http.put<ReportCage>(`${cageUrl(sectorId, reportId, cageId)}/feed`, body)),
    );
  }

  // ---------------------------------------------------------------- painel (006)

  async getDashboardOverview(): Promise<Result<DashboardOverview>> {
    return resultOf(() => firstValueFrom(this.http.get<DashboardOverview>('/api/v1/dashboard')));
  }

  async getSectorDashboard(sectorId: string, period: DashboardPeriod): Promise<Result<SectorDashboard>> {
    const params = new HttpParams().set('period', period);
    return resultOf(() =>
      firstValueFrom(
        this.http.get<SectorDashboard>(`/api/v1/sectors/${encodeURIComponent(sectorId)}/dashboard`, { params }),
      ),
    );
  }

  /**
   * A planilha dos relatórios do intervalo (007). A data em branco não vai, e o backend diz que falta; a
   * recusa, que chega como Blob, é lida pelo `fileResultOf`.
   */
  exportDailyReports(sectorId: string, from: string, to: string): Promise<Result<SpreadsheetFile>> {
    let params = new HttpParams();
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return fileResultOf(
      () =>
        firstValueFrom(
          this.http.get(`${reportsUrl(sectorId)}/export`, { params, responseType: 'blob', observe: 'response' }),
        ),
      'relatorios.xlsx',
    );
  }

  /** A planilha do painel do setor no período (007), com a recusa lida pelo `fileResultOf`. */
  exportSectorDashboard(sectorId: string, period: DashboardPeriod): Promise<Result<SpreadsheetFile>> {
    const params = new HttpParams().set('period', period);
    return fileResultOf(
      () =>
        firstValueFrom(
          this.http.get(`/api/v1/sectors/${encodeURIComponent(sectorId)}/dashboard/export`, {
            params,
            responseType: 'blob',
            observe: 'response',
          }),
        ),
      'painel.xlsx',
    );
  }
}
