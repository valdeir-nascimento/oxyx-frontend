import { SegmentOption } from '../../../shared/presentation/ui/segmented-control/segmented-control';
import { StatusBadgeTone } from '../../../shared/presentation/ui/status-badge/status-badge';
import { FarmStatus } from '../../domain/status';

/** A situação de um setor, no masculino: "setor ativo". */
export function sectorStatusLabelOf(status: FarmStatus): string {
  return status === 'ACTIVE' ? 'Ativo' : 'Inativo';
}

/** A situação de uma gaiola, no feminino: "gaiola ativa". */
export function cageStatusLabelOf(status: FarmStatus): string {
  return status === 'ACTIVE' ? 'Ativa' : 'Inativa';
}

/** O tom do selo de situação: ativo em verde, inativo neutro. */
export function statusToneOf(status: FarmStatus): StatusBadgeTone {
  return status === 'ACTIVE' ? 'success' : 'neutral';
}

/** O filtro de situação da lista de setores; os ativos vêm primeiro, porque são o padrão (FR-005). */
export const SECTOR_STATUS_OPTIONS: readonly SegmentOption[] = [
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Inativos' },
  { value: 'ALL', label: 'Todos' },
];

/** O filtro de situação da lista de gaiolas; as ativas vêm primeiro, porque são o padrão. */
export const CAGE_STATUS_OPTIONS: readonly SegmentOption[] = [
  { value: 'ACTIVE', label: 'Ativas' },
  { value: 'INACTIVE', label: 'Inativas' },
  { value: 'ALL', label: 'Todas' },
];

/** Um número inteiro como a granja o lê: com o ponto dos milhares. */
export function countOf(value: number): string {
  return value.toLocaleString('pt-BR');
}
