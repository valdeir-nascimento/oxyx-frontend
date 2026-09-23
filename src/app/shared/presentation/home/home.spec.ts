import { TestBed } from '@angular/core/testing';
import { Home } from './home';

describe('Home', () => {
  it('greets whoever reached the authenticated area', async () => {
    await TestBed.configureTestingModule({ imports: [Home] }).compileComponents();

    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      'Início',
    );
  });
});
