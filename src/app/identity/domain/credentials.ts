import { DomainError } from '../../shared/domain/domain-error';
import { Notification } from '../../shared/domain/notification';

/** O que a pessoa digita na tela de acesso. */
export interface Credentials {
  readonly identifier: string;
  readonly password: string;
}

/**
 * Regras que o cliente consegue verificar sozinho, antes de ir à rede.
 *
 * São só as de preenchimento: se o identificador é e-mail ou celular, e se a senha está certa,
 * quem decide é o backend. Duplicar essas duas decisões aqui faria as pontas divergirem — foi
 * divergência assim que abriu brecha na contenção de tentativas (FR-023).
 *
 * Acumula as duas violações, como o FR-017 exige: quem deixa os dois campos vazios vê os dois
 * avisos de uma vez.
 */
export function validateCredentials(credentials: Credentials): Notification {
  const violations: DomainError[] = [];

  if (isBlank(credentials.identifier)) {
    violations.push({
      code: 'IDENTIFIER_REQUIRED',
      field: 'identifier',
      message: 'Informe o e-mail ou o celular.',
    });
  }
  if (isBlank(credentials.password)) {
    violations.push({
      code: 'PASSWORD_REQUIRED',
      field: 'password',
      message: 'Informe a senha.',
    });
  }

  return Notification.of(violations);
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}
