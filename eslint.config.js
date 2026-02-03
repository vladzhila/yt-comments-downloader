import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['dist/**', 'coverage/**'] },
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        Bun: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-else-return': 'error',
      'no-nested-ternary': 'error',
      'object-shorthand': 'error',
      curly: ['error', 'all'],
      'object-curly-newline': [
        'error',
        {
          ObjectExpression: {
            multiline: true,
            minProperties: 2,
          },
          ObjectPattern: { multiline: true },
          ImportDeclaration: { multiline: true },
          ExportDeclaration: {
            multiline: true,
            minProperties: 2,
          },
        },
      ],
    },
  },
]
