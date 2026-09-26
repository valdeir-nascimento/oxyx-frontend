/**
 * Um número digitado, como os contratos o recebem: o inteiro vai como número; o vazio, como ausente; e o
 * resto, como foi digitado, para o backend recusar junto do campo, com a mensagem de número inteiro
 * (FR-017). O ponto de milhar vale ("1.000" é mil), porque é assim que as dicas e as mensagens escrevem;
 * o "12.5" não tem três dígitos depois do ponto, e continua texto.
 *
 * Nasceu no adaptador do farm e veio para o shared na feature 003, para o production usar também.
 */
export function jsonNumberOf(typed: string): number | string | null {
  const text = typed.trim();
  if (text === '') {
    return null;
  }
  if (/^[+-]?\d{1,3}(\.\d{3})+$/.test(text)) {
    return Number(text.replaceAll('.', ''));
  }
  return /^[+-]?\d+$/.test(text) ? Number(text) : typed;
}
