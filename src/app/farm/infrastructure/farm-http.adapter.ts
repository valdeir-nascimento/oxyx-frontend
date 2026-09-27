import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Result } from '../../shared/application/result';
import { resultOf } from '../../shared/infrastructure/http-result';
import { jsonNumberOf } from '../../shared/infrastructure/typed-number';
import { CageGateway } from '../application/cage/cage-gateway';
import { FeedFormulaGateway } from '../application/formula/feed-formula-gateway';
import { SectorGateway } from '../application/sector/sector-gateway';
import { Cage, CageInput, CagePage, CageSearch } from '../domain/cage';
import { FeedFormula, FeedFormulaInput } from '../domain/feed-formula';
import { Sector, SectorInput, SectorSummary } from '../domain/sector';
import { StatusFilter } from '../domain/status';

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
export class FarmHttpAdapter implements SectorGateway, CageGateway, FeedFormulaGateway {
  private readonly http = inject(HttpClient);

  async listSectors(status: StatusFilter): Promise<Result<readonly SectorSummary[]>> {
    const params = new HttpParams().set('status', status);
    return resultOf(() => firstValueFrom(this.http.get<SectorSummary[]>(SECTORS, { params })));
  }

  async findSector(id: string): Promise<Result<Sector>> {
    return resultOf(() => firstValueFrom(this.http.get<Sector>(sectorUrl(id))));
  }

  async registerSector(input: SectorInput): Promise<Result<Sector>> {
    return resultOf(() => firstValueFrom(this.http.post<Sector>(SECTORS, input)));
  }

  async updateSector(id: string, input: SectorInput): Promise<Result<Sector>> {
    return resultOf(() => firstValueFrom(this.http.put<Sector>(sectorUrl(id), input)));
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
}
