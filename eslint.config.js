const globals = require('globals')
const pluginJs = require('@eslint/js')
const pluginPromise = require('eslint-plugin-promise')
const nodePlugin = require('eslint-plugin-n')
const pluginJest = require('eslint-plugin-jest')


/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'common',
        allowImportExportEverywhere: true
      },
      globals: {
        ...globals.node,
        ...pluginJest.environments.globals.globals
      }
    },
    plugins: { jest: pluginJest },
  },
  nodePlugin.configs['flat/recommended-script'],
  {
    rules: {
      'n/no-extraneous-require': ['error', {
        allowModules: [
          'globals'
        ]
      }],
      'n/no-unpublished-require': ['error', {
        allowModules: [
          '@eslint/js',
          'eslint-plugin-promise',
          'eslint-plugin-n',
          'eslint-plugin-jest'
        ]
      }]
    }
  },
  pluginPromise.configs['flat/recommended'],
  pluginJs.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn'
    }
  }
]