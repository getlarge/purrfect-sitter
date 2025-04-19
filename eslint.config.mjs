import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
          depConstraints: [
            {
              sourceTag: 'scope:auth',
              onlyDependOnLibsWithTags: [
                'scope:auth',
                'scope:cat-sittings',
                'scope:cats',
                'scope:reviews',
                'scope:shared',
                'scope:users',
              ],
            },
            {
              sourceTag: 'scope:cats',
              onlyDependOnLibsWithTags: [
                'scope:auth',
                'scope:cats',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:cat-sittings',
              onlyDependOnLibsWithTags: [
                'scope:auth',
                'scope:cat-sittings',
                'scope:cats',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'scope:reviews',
              onlyDependOnLibsWithTags: [
                'scope:auth',
                'scope:cat-sittings',
                'scope:cats',
                'scope:reviews',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:users',
              onlyDependOnLibsWithTags: [
                'scope:auth',
                'scope:users',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:app',
                'type:core',
                'type:middlewares',
                'type:repositories',
                'type:services',
              ],
            },
            {
              sourceTag: 'type:core',
              onlyDependOnLibsWithTags: ['type:core'],
            },
            {
              sourceTag: 'type:e2e',
              onlyDependOnLibsWithTags: [
                'type:core',
                'type:middlewares',
                'type:repositories',
                'type:services',
              ],
            },
            {
              sourceTag: 'type:middlewares',
              onlyDependOnLibsWithTags: [
                'type:core',
                'type:middlewares',
                'type:repositories',
              ],
            },
            {
              sourceTag: 'type:repositories',
              onlyDependOnLibsWithTags: ['type:core', 'type:repositories'],
            },
            {
              sourceTag: 'type:services',
              onlyDependOnLibsWithTags: [
                'type:core',
                'type:services',
                'type:repositories',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
