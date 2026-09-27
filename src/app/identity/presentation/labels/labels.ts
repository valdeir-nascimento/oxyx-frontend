import { SelectOption } from '../../../shared/presentation/ui/select-field/select-field';
import { Role } from '../../domain/authenticated-caretaker';
import { CaretakerStatus } from '../../domain/caretaker';

/** O perfil em português, como as telas o mostram (princípio VII). */
export function roleLabelOf(role: Role): string {
  return role === 'ADMINISTRATOR' ? 'Administrador' : 'Usuário';
}

/** A situação em português. */
export function statusLabelOf(status: CaretakerStatus): string {
  return status === 'ACTIVE' ? 'Ativo' : 'Inativo';
}

/** Os perfis, para escolha; o usuário comum primeiro, por ser o de menor alcance. */
export const ROLE_OPTIONS: readonly SelectOption[] = [
  { value: 'USER', label: roleLabelOf('USER') },
  { value: 'ADMINISTRATOR', label: roleLabelOf('ADMINISTRATOR') },
];
