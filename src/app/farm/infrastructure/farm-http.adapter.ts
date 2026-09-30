import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Result } from '../../shared/application/result';
import { SpreadsheetFile } from '../../shared/application/spreadsheet-file';
import { fileResultOf, resultOf } from '../../shared/infrastructure/http-result';
import { jsonNumberOf } from '../../shared/infrastructure/typed-number';
import { CageGateway } from '../application/cage/cage-gateway';
import { FeedFormulaGateway } from '../application/formula/feed-formula-gateway';
import { SectorGateway } from '../application/sector/sector-gateway';
import { WeighingGateway } from '../application/weighing/weighing-gateway';
import { Cage, CageExport, CageInput, CagePage, CageSearch } from '../domain/cage';
import { FeedFormula, FeedFormulaInput } from '../domain/feed-formula';
import { Sector, SectorInput, SectorSummary } from '../domain/sector';
import { StatusFilter } from '../domain/status';
import { Weighing, WeighingInput, WeighingOverview } from '../domain/weighing';

const SECTORS = '/api/v1/sectors';
const FORMULAS = '/api/v1/feed-formulas';

/**
 * Endereço de um setor na API.
 *
 * O identificador vem do endereço da tela, e o navegador resolve os `..` de um caminho: sem
 * codificar, um identificador forjado chamaria outro endpoint.
 */
function sectorUrl(id: string): string {
  return `${SECTORS}/${encodeURIComponent(id)}`;
}

/** Endereço das gaiolas de um setor, e de uma delas, com os dois identificadores codificados. */
function cagesUrl(sectorId: string, cageId?: string): string {
  const cages = `${sectorUrl(sectorId)}/cages`;
  return cageId === undefined ? cages : `${cages}/${encodeURIComponent(cageId)}`;
}

/** Endereço das pesagens de uma gaiola, e de uma delas, com os identificadores codificados. */
function weighingsUrl(sectorId: string, cageId: string, weighingId?: string): string {
  const weighings = `${cagesUrl(sectorId, cageId)}/weighings`;
  return weighingId === undefined ? weighings : `${weighings}/${encodeURIComponent(weighingId)}`;
}

/**
 * O corpo de registro e de correção de pesagem. O peso vai como foi digitado, com a vírgula: quem lê a
 * casa decimal, e recusa as duas casas no campo, é o backend (R-007 da 005).
 */
function weighingBodyOf(input: WeighingInput): Record<string, unknown> {
  return { weighedOn: input.weighedOn, averageWeight: input.averageWeight };
}

/** Endereço de uma fórmula de ração, com o identificador codificado, como o do setor. */
function formulaUrl(id: string): string {
  return `${FORMULAS}/${encodeURIComponent(id)}`;
}

/**
 * O corpo de cadastro e de edição de fórmula. O preço vai como foi digitado, com a vírgula: quem lê o
 * decimal, e recusa as três casas no campo, é o backend (R-011 da 004). O consumo esperado vai como
 * número, como as quantidades da gaiola.
 */
function formulaBodyOf(input: FeedFormulaInput): Record<string, unknown> {
  return {
    name: input.name,
    pricePerKg: input.pricePerKg,
    expectedIntake: jsonNumberOf(input.expectedIntake),
    description: input.description,
  };
}

/**
 * O corpo de cadastro e de edição de setor. Os limites da faixa de peso vão como número, como as
 * quantidades da gaiola, e os vazios ficam de fora: sem os dois, o setor fica sem faixa (feature 005).
 */
function sectorBodyOf(input: SectorInput): Record<string, unknown> {
  return {
    name: input.name,
    description: input.description,
    minimumWeight: jsonNumberOf(input.minimumWeight),
    maximumWeight: jsonNumberOf(input.maximumWeight),
  };
}

/** O corpo de cadastro e de edição de gaiola. */
function cageBodyOf(input: CageInput): Record<string, unknown> {
  return {
    battery: input.battery,
    number: jsonNumberOf(input.number),
    birdCount: jsonNumberOf(input.birdCount),
  };
}

/**
 * Implementação das portas do contexto farm sobre HTTP (contracts/farm-api.yaml e
 * contracts/feed-formulas-api.yaml).
 *
 * É o único lugar do contexto que conhece `HttpClient`, caminho de endpoint e formato de erro. Toda
 * recusa vira `Result`, nunca exceção, por `resultOf`.
 */
@Injectable({ providedIn: 'root' })
export class FarmHttpAdapter implements SectorGateway, CageGateway, FeedFormulaGateway, WeighingGateway {
  private readonly http = inject(HttpClient);

  async listSectors(status: StatusFilter): Promise<Result<readonly SectorSummary[]>> {
    const params = new HttpParams().set('status', status);
    return resultOf(() => firstValueFrom(this.http.get<SectorSummary[]>(SECTORS, { params })));
  }

  async findSector(id: string): Promise<Result<Sector>> {
    return resultOf(() => firstValueFrom(this.http.get<Sector>(sectorUrl(id))));
  }

  async registerSector(input: SectorInput): Promise<Result<Sector>> {
    return resultOf(() => firstValueFrom(this.http.post<Sector>(SECTORS, sectorBodyOf(input))));
  }

  async updateSector(id: string, input: SectorInput): Promise<Result<Sector>> {
    return resultOf(() => firstValueFrom(this.http.put<Sector>(sectorUrl(id), sectorBodyOf(input))));
  }

  async deactivateSector(id: string): Promise<Result<Sector>> {
    return resultOf(() => firstValueFrom(this.http.post<Sector>(`${sectorUrl(id)}/deactivation`, null)));
  }

  async reactivateSector(id: string): Promise<Result<Sector>> {
    return resultOf(() => firstValueFrom(this.http.post<Sector>(`${sectorUrl(id)}/reactivation`, null)));
  }

  async searchCages(sectorId: string, search: CageSearch): Promise<Result<CagePage>> {
    // Só vão os filtros pedidos: um parâmetro vazio seria outra pergunta ao backend.
    let params = new HttpParams().set('status', search.status).set('page', search.page).set('size', search.size);
    if (search.code) {
      params = params.set('code', search.code);
    }
    if (search.battery) {
      params = params.set('battery', search.battery);
    }
    return resultOf(() => firstValueFrom(this.http.get<CagePage>(cagesUrl(sectorId), { params })));
  }

  async findCage(sectorId: string, cageId: string): Promise<Result<Cage>> {
    return resultOf(() => firstValueFrom(this.http.get<Cage>(cagesUrl(sectorId, cageId))));
  }

  async registerCage(sectorId: string, input: CageInput): Promise<Result<Cage>> {
    return resultOf(() => firstValueFrom(this.http.post<Cage>(cagesUrl(sectorId), cageBodyOf(input))));
  }

  async updateCage(sectorId: string, cageId: string, input: CageInput): Promise<Result<Cage>> {
    return resultOf(() =>
      firstValueFrom(this.http.put<Cage>(cagesUrl(sectorId, cageId), cageBodyOf(input))),
    );
  }

  async deactivateCage(sectorId: string, cageId: string): Promise<Result<Cage>> {
    return resultOf(() =>
      firstValueFrom(this.http.post<Cage>(`${cagesUrl(sectorId, cageId)}/deactivation`, null)),
    );
  }

  async reactivateCage(sectorId: string, cageId: string): Promise<Result<Cage>> {
    return resultOf(() =>
      firstValueFrom(this.http.post<Cage>(`${cagesUrl(sectorId, cageId)}/reactivation`, null)),
    );
  }

  async listFeedFormulas(status: StatusFilter): Promise<Result<readonly FeedFormula[]>> {
    const params = new HttpParams().set('status', status);
    return resultOf(() => firstValueFrom(this.http.get<FeedFormula[]>(FORMULAS, { params })));
  }

  async findFeedFormula(id: string): Promise<Result<FeedFormula>> {
    return resultOf(() => firstValueFrom(this.http.get<FeedFormula>(formulaUrl(id))));
  }

  async registerFeedFormula(input: FeedFormulaInput): Promise<Result<FeedFormula>> {
    return resultOf(() => firstValueFrom(this.http.post<FeedFormula>(FORMULAS, formulaBodyOf(input))));
  }

  async updateFeedFormula(id: string, input: FeedFormulaInput): Promise<Result<FeedFormula>> {
    return resultOf(() => firstValueFrom(this.http.put<FeedFormula>(formulaUrl(id), formulaBodyOf(input))));
  }

  async deactivateFeedFormula(id: string): Promise<Result<FeedFormula>> {
    return resultOf(() => firstValueFrom(this.http.post<FeedFormula>(`${formulaUrl(id)}/deactivation`, null)));
  }

  async reactivateFeedFormula(id: string): Promise<Result<FeedFormula>> {
    return resultOf(() => firstValueFrom(this.http.post<FeedFormula>(`${formulaUrl(id)}/reactivation`, null)));
  }

  async getWeighingOverview(sectorId: string, cageId: string): Promise<Result<WeighingOverview>> {
    return resultOf(() => firstValueFrom(this.http.get<WeighingOverview>(weighingsUrl(sectorId, cageId))));
  }

  async recordWeighing(sectorId: string, cageId: string, input: WeighingInput): Promise<Result<Weighing>> {
    return resultOf(() =>
      firstValueFrom(this.http.post<Weighing>(weighingsUrl(sectorId, cageId), weighingBodyOf(input))),
    );
  }

  async findWeighing(sectorId: string, cageId: string, weighingId: string): Promise<Result<Weighing>> {
    return resultOf(() =>
      firstValueFrom(this.http.get<Weighing>(weighingsUrl(sectorId, cageId, weighingId))),
    );
  }

  async correctWeighing(
    sectorId: string,
    cageId: string,
    weighingId: string,
    input: WeighingInput,
  ): Promise<Result<Weighing>> {
    return resultOf(() =>
      firstValueFrom(
        this.http.put<Weighing>(weighingsUrl(sectorId, cageId, weighingId), weighingBodyOf(input)),
      ),
    );
  }

  async voidWeighing(sectorId: string, cageId: string, weighingId: string): Promise<Result<void>> {
    return resultOf(() =>
      firstValueFrom(this.http.post<void>(`${weighingsUrl(sectorId, cageId, weighingId)}/voiding`, null)),
    );
  }

  /**
   * A planilha das gaiolas (007): os filtros da lista, sem página. Só vão os filtros pedidos, como na
   * pesquisa; a recusa, que chega como Blob, é lida pelo `fileResultOf`.
   */
  exportCages(sectorId: string, filters: CageExport): Promise<Result<SpreadsheetFile>> {
    let params = new HttpParams().set('status', filters.status);
    if (filters.code) {
      params = params.set('code', filters.code);
    }
    if (filters.battery) {
      params = params.set('battery', filters.battery);
    }
    return fileResultOf(
      () =>
        firstValueFrom(
          this.http.get(`${cagesUrl(sectorId)}/export`, { params, responseType: 'blob', observe: 'response' }),
        ),
      'gaiolas.xlsx',
    );
  }
}
