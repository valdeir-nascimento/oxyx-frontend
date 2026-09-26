import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Result } from '../../shared/application/result';
import { resultOf } from '../../shared/infrastructure/http-result';
import { jsonNumberOf } from '../../shared/infrastructure/typed-number';
import { DailyReportGateway } from '../application/daily-report/daily-report-gateway';
import {
  DailyReport,
  DailyReportInput,
  DailyReportPage,
  DailyReportSearch,
  DailyReportSuggestion,
  MortalityInput,
  ProductionInput,
  ReportCage,
} from '../domain/daily-report';

/**
 * Endereço dos relatórios de um setor, e de um deles, com os identificadores codificados: eles vêm do
 * endereço da tela, e o navegador resolve os `..` de um caminho.
 */
function reportsUrl(sectorId: string, reportId?: string): string {
  const reports = `/api/v1/sectors/${encodeURIComponent(sectorId)}/daily-reports`;
  return reportId === undefined ? reports : `${reports}/${encodeURIComponent(reportId)}`;
}

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
export class ProductionHttpAdapter implements DailyReportGateway {
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
}
