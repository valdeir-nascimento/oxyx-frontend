import { TestBed } from '@angular/core/testing';
import { BrowserFileSaver } from './browser-file-saver';

/**
 * O salvamento do arquivo baixado (R-014 da 007): um link temporário com o nome do arquivo, clicado e
 * retirado, e o endereço do Blob revogado depois do clique. Nenhum componente mexe no DOM para isso.
 */
describe('BrowserFileSaver', () => {
  const content = new Blob(['PK'], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const createObjectURL = vi.fn(() => 'blob:http://localhost/planilha');
  const revokeObjectURL = vi.fn();
  let clicked: HTMLAnchorElement[];

  beforeEach(() => {
    vi.useFakeTimers();
    clicked = [];
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this);
      expect(document.body.contains(this)).toBe(true);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('clicks a link with the name of the file and the address of the Blob', () => {
    TestBed.inject(BrowserFileSaver).save({ name: 'gaiolas-codornas-galpao-1.xlsx', content });

    expect(createObjectURL).toHaveBeenCalledWith(content);
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe('gaiolas-codornas-galpao-1.xlsx');
    expect(clicked[0].href).toBe('blob:http://localhost/planilha');
  });

  it('leaves no link behind', () => {
    TestBed.inject(BrowserFileSaver).save({ name: 'gaiolas.xlsx', content });

    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  });

  it('revokes the address of the Blob after the click', () => {
    TestBed.inject(BrowserFileSaver).save({ name: 'gaiolas.xlsx', content });
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/planilha');
  });
});
