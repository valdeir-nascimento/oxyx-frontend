import { DomainError } from '../../shared/domain/domain-error';
import { Notification } from '../../shared/domain/notification';

/** O que a pessoa digita na tela de troca de senha. */
export interface PasswordChange {
  readonly currentPassword: string;
  readonly newPassword: string;
}

/**
 * Regras que o cliente consegue verificar sozinho, antes de ir à rede.
 *
 * São só as de preenchimento. Comprimento, letra, dígito e semelhança com o identificador são a
 * política do backend (`PasswordPolicy`, FR-022): duplicá-las aqui criaria duas políticas para
 * manter, e a divergência entre elas apareceria como senha recusada na tela e aceita na API.
 *
 * As mensagens são as mesmas que o backend usa para o mesmo caso, para que corrigir o campo pelo
 * cliente ou pela API dê a mesma instrução.
 *
 * Acumula as duas violações, como o FR-017 exige.
 */
export function validatePasswordChange(change: PasswordChange): Notification {
  const violations: DomainError[] = [];

  if (isBlank(change.currentPassword)) {
    violations.push({
      code: 'CURRENT_PASSWORD_REQUIRED',
      field: 'currentPassword',
      message: 'Informe a senha atual.',
    });
  }
  if (isBlank(change.newPassword)) {
    violations.push({
      code: 'NEW_PASSWORD_REQUIRED',
      field: 'newPassword',
      message: 'Informe a senha.',
    });
  }

  return Notification.of(violations);
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}
