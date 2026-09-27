import { ActivatedRouteSnapshot } from '@angular/router';

/**
 * O parâmetro da rota ou de uma rota acima dela: os diálogos de lançamento são netos da página do
 * relatório, que tem o setor e o relatório no endereço.
 */
export function paramOf(route: ActivatedRouteSnapshot | null, name: string): string {
  for (let current = route; current; current = current.parent) {
    const value = current.paramMap.get(name);
    if (value !== null) {
      return value;
    }
  }
  return '';
}
