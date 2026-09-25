import { HttpClient, HttpContext, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Result, failure, success } from '../../shared/application/result';
import { SKIP_SESSION_HANDLING } from './session.interceptor';
import { ProblemDetails, toNotification } from '../../shared/infrastructure/problem-details';
import { AuthenticatedCaretaker } from '../domain/authenticated-caretaker';
import {
  CaretakerDetail,
  CaretakerPage,
  CaretakerRegistration,
  CaretakerSearch,
  CaretakerUpdate,
} from '../domain/caretaker';
import { Credentials } from '../domain/credentials';
import { PasswordChange } from '../domain/password-change';
import { AccountGateway } from '../application/account/account-gateway';
import { AuthenticationGateway } from '../application/authentication/authentication-gateway';
import { CaretakerGateway } from '../application/caretaker/caretaker-gateway';

const BASE = '/api/v1';

/**
 * Implementação das portas de identidade, de conta e da administração de responsáveis sobre HTTP.
 *
 * É o **único** lugar do cliente que conhece `HttpClient`, caminho de endpoint e formato de erro.
 * O cookie de sessão é do navegador: nada de token guardado aqui, e nada de estado de sessão nesta
 * classe.
 *
 * <p>Toda recusa vira `Result`, nunca exceção — quem chama é caso de uso, e caso de uso não trata
 * `catch` (princípio IV, espelhado no cliente).
 */
/**
 * Endereço de um responsável na API.
 *
 * O identificador vem do endereço da tela, e o navegador resolve os `..` de um caminho: sem
 * codificar, `/responsaveis/..%2F..%2Fme%2Fpassword` chamava `/api/v1/me/password`.
 */
function caretakerUrl(id: string): string {
  return `${BASE}/caretakers/${encodeURIComponent(id)}`;
}

@Injectable({ providedIn: 'root' })
export class IdentityHttpAdapter implements AuthenticationGateway, AccountGateway, CaretakerGateway {
  private readonly http = inject(HttpClient);

  async signIn(credentials: Credentials): Promise<Result<AuthenticatedCaretaker>> {
    return this.request(() =>
      firstValueFrom(
        this.http.post<AuthenticatedCaretaker>(`${BASE}/auth/sign-in`, credentials, {
          // O 401 aqui é senha errada, não sessão expirada: quem trata é a própria tela.
          context: new HttpContext().set(SKIP_SESSION_HANDLING, true),
        }),
      ),
    );
  }

  async signOut(): Promise<Result<void>> {
    return this.request(async () => {
      await firstValueFrom(this.http.post<void>(`${BASE}/auth/sign-out`, null));
    });
  }

  async currentCaretaker(): Promise<Result<AuthenticatedCaretaker>> {
    return this.request(() =>
      firstValueFrom(
        this.http.get<AuthenticatedCaretaker>(`${BASE}/auth/me`, {
          // Sondagem de identidade no carregamento: quem nunca entrou recebe 401 aqui, e isso não
          // é "sessão expirada".
          context: new HttpContext().set(SKIP_SESSION_HANDLING, true),
        }),
      ),
    );
  }

  async changeOwnPassword(change: PasswordChange): Promise<Result<void>> {
    return this.request(async () => {
      await firstValueFrom(this.http.put<void>(`${BASE}/me/password`, change));
    });
  }

  async search(search: CaretakerSearch): Promise<Result<CaretakerPage>> {
    // Só vão os filtros pedidos: um `status` vazio seria recusado pelo backend como valor inválido.
    let params = new HttpParams().set('page', search.page).set('size', search.size);
    if (search.name) {
      params = params.set('name', search.name);
    }
    if (search.status) {
      params = params.set('status', search.status);
    }
    return this.request(() => firstValueFrom(this.http.get<CaretakerPage>(`${BASE}/caretakers`, { params })));
  }

  async find(id: string): Promise<Result<CaretakerDetail>> {
    return this.request(() => firstValueFrom(this.http.get<CaretakerDetail>(caretakerUrl(id))));
  }

  async register(registration: CaretakerRegistration): Promise<Result<CaretakerDetail>> {
    return this.request(() =>
      firstValueFrom(this.http.post<CaretakerDetail>(`${BASE}/caretakers`, registration)),
    );
  }

  async update(id: string, update: CaretakerUpdate): Promise<Result<CaretakerDetail>> {
    return this.request(() =>
      firstValueFrom(this.http.put<CaretakerDetail>(caretakerUrl(id), update)),
    );
  }

  async deactivate(id: string): Promise<Result<CaretakerDetail>> {
    return this.request(() =>
      firstValueFrom(this.http.post<CaretakerDetail>(`${caretakerUrl(id)}/deactivation`, null)),
    );
  }

  /** Executa a chamada e traduz a recusa do backend em `Result`, preservando as suas mensagens. */
  private async request<T>(call: () => Promise<T>): Promise<Result<T>> {
    try {
      return success(await call());
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) {
        // Defeito do cliente — um `TypeError`, por exemplo — não é recusa do backend. Traduzi-lo em
        // "tente novamente" esconderia de quem programa o erro que só ele pode corrigir.
        throw error;
      }
      return failure(toNotification(problemOf(error)));
    }
  }
}

/**
 * Corpo de erro do backend, quando houver; `null` quando não há.
 *
 * Numa falha de rede o `error` é um `ProgressEvent`, que é objeto mas não é Problem Details — e
 * tratá-lo como tal produzia uma violação com mensagem `undefined` na tela. Por isso a checagem é
 * pelo que o corpo carrega, e não pelo tipo.
 */
function problemOf(error: HttpErrorResponse): ProblemDetails | null {
  const body: unknown = error.error;
  const isProblem =
    typeof body === 'object' &&
    body !== null &&
    ('code' in body || 'title' in body || 'detail' in body);

  return isProblem ? (body as ProblemDetails) : null;
}
