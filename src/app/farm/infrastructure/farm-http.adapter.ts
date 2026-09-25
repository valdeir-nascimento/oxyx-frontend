import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Result } from '../../shared/application/result';
import { resultOf } from '../../shared/infrastructure/http-result';
import { CageGateway } from '../application/cage/cage-gateway';
import { SectorGateway } from '../application/sector/sector-gateway';
import { Cage, CageInput, CagePage, CageSearch } from '../domain/cage';
import { Sector, SectorInput, SectorSummary } from '../domain/sector';
import { StatusFilter } from '../domain/status';

const SECTORS = '/api/v1/sectors';

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

/**
 * Um número digitado, como o contrato o recebe: o inteiro vai como número; o vazio, como ausente; e o
 * resto, como foi digitado, para o backend recusar junto do campo, com a mensagem de número inteiro
 * (FR-017). O ponto de milhar vale ("1.000" é mil), porque é assim que a dica e a mensagem escrevem; o
 * "12.5" não tem três dígitos depois do ponto, e continua texto.
 */
function jsonNumberOf(typed: string): number | string | null {
  const text = typed.trim();
  if (text === '') {
    return null;
  }
  if (/^[+-]?\d{1,3}(\.\d{3})+$/.test(text)) {
    return Number(text.replaceAll('.', ''));
  }
  return /^[+-]?\d+$/.test(text) ? Number(text) : typed;
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
 * Implementação das portas do contexto farm sobre HTTP (contracts/farm-api.yaml).
 *
 * É o único lugar do contexto que conhece `HttpClient`, caminho de endpoint e formato de erro. Toda
 * recusa vira `Result`, nunca exceção, por `resultOf`.
 */
@Injectable({ providedIn: 'root' })
export class FarmHttpAdapter implements SectorGateway, CageGateway {
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
}
