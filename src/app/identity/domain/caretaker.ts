import { Role } from './authenticated-caretaker';

/** Situação do responsável. Inativar substitui a exclusão do legado (FR-018). */
export type CaretakerStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Responsável na lista e na pesquisa, como o backend o devolve (`CaretakerSummary`). Nunca carrega
 * senha nem hash.
 */
export interface CaretakerSummary {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly mobilePhone: string;
  readonly role: Role;
  readonly status: CaretakerStatus;
}

/** Responsável no detalhe e na edição: o resumo, mais CPF e datas (`CaretakerDetail`). */
export interface CaretakerDetail extends CaretakerSummary {
  readonly cpf: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Uma página da pesquisa, com os totais de todas as páginas. */
export interface CaretakerPage {
  readonly content: readonly CaretakerSummary[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
}

/** O que a pessoa pede na lista: trecho do nome, situação e página. */
export interface CaretakerSearch {
  readonly name?: string;
  readonly status?: CaretakerStatus;
  readonly page: number;
  readonly size: number;
}

/**
 * Cadastro de responsável, como o formulário o envia.
 *
 * Os campos vão como foram digitados: quem valida — e devolve todas as falhas de uma vez (FR-017)
 * — é o backend. O perfil pode faltar, e o backend recusa com a mensagem do campo.
 */
export interface CaretakerRegistration {
  readonly fullName: string;
  readonly cpf: string;
  readonly email: string;
  readonly mobilePhone: string;
  readonly password: string;
  readonly role: Role | null;
}

/** Edição de responsável. Não troca senha. */
export type CaretakerUpdate = Omit<CaretakerRegistration, 'password'>;
