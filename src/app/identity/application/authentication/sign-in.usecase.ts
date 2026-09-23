import { Injectable, inject } from '@angular/core';
import { Result, failure } from '../../../shared/application/result';
import { AuthenticatedCaretaker } from '../../domain/authenticated-caretaker';
import { validateCredentials } from '../../domain/credentials';
import { AUTHENTICATION_GATEWAY } from './authentication-gateway';
import { SessionStore } from './session-store';

/**
 * Entrada no sistema (FR-001).
 *
 * Valida o que dá para validar sem rede, delega ao backend e devolve `Result`. A recusa do backend
 * passa como veio: a mensagem genérica é decisão dele (FR-002), e reescrevê-la aqui reintroduziria
 * a diferença que o requisito manda apagar.
 *
 * Quando a entrada é aceita, registra quem entrou — é disso que a casca tira o nome e o perfil.
 */
@Injectable({ providedIn: 'root' })
export class SignInUseCase {
  private readonly identity = inject(AUTHENTICATION_GATEWAY);
  private readonly session = inject(SessionStore);

  async execute(identifier: string, password: string): Promise<Result<AuthenticatedCaretaker>> {
    const credentials = { identifier, password };
    const violations = validateCredentials(credentials);

    if (violations.hasErrors) {
      return failure(violations);
    }

    const result = await this.identity.signIn(credentials);

    if (result.success) {
      this.session.remember(result.value);
    }

    return result;
  }
}
