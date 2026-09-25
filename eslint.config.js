// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'ovyx',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'ovyx',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },

  // Regra de dependencia entre camadas (principio I), o equivalente da suite ArchUnit do backend.
  // Testes ficam de fora, como la: eles montam cenarios que cruzam camadas de proposito.
  {
    files: ['src/app/**/domain/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/application/**', '**/infrastructure/**', '**/presentation/**'],
              message: 'domain não depende de nenhuma outra camada (princípio I).',
            },
            {
              group: ['@angular/*', 'rxjs', 'rxjs/*'],
              message: 'domain é livre de framework (princípio I).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/**/application/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**', '**/presentation/**'],
              message: 'application depende só de domain; acesso à rede fica em infrastructure (princípio I).',
            },
            {
              group: ['@angular/common/http', '@angular/common/http/*'],
              message: 'application declara portas; quem conhece HttpClient é infrastructure (princípio I).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/**/presentation/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**'],
              message: 'presentation usa os casos de uso de application, nunca os adaptadores (princípio I).',
            },
            {
              group: ['@angular/common/http', '@angular/common/http/*'],
              message: 'componente não faz chamada HTTP (restrições tecnológicas da constituição).',
            },
          ],
        },
      ],
    },
  },
  // `shared` nao conhece contexto de negocio: quem se liga a `shared` e o contexto, por entrada e
  // por porta. A regra usa a variante do typescript-eslint de proposito — a do ESLint base ja esta
  // ocupada pelas regras de camada acima, e a ultima configuracao a casar sobrescreveria aquelas.
  {
    files: ['src/app/shared/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/identity/**', '**/farm/**'],
              message:
                'shared não depende de contexto de negócio; é o contexto que se liga a shared (princípio I).',
            },
          ],
        },
      ],
    },
  },
  // Um contexto não conhece o outro (R-008 da feature 002, espelhado no cliente): o que eles dividem
  // passa pelo `shared`, como o perfil de quem vê (`VIEWER`). Só a composição da aplicação — `app.config`
  // e `app.routes`, na raiz — liga os dois. A mesma variante da regra do `shared`, pelo mesmo motivo.
  {
    files: ['src/app/farm/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/identity/**'],
              message: 'farm não depende de identity; o que os dois dividem passa pelo shared (princípio I, R-008).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/identity/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/farm/**'],
              message: 'identity não depende de farm; o que os dois dividem passa pelo shared (princípio I, R-008).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/**/infrastructure/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/presentation/**'],
              message: 'infrastructure e presentation são camadas irmãs: nenhuma depende da outra (princípio I).',
            },
          ],
        },
      ],
    },
  },
]);
