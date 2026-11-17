import neostandard from 'neostandard'

export default neostandard({
  env: ['node', 'vitest'],
  ignores: [
    ...neostandard.resolveIgnoresFromGitignore(),
    '.public/**',
    'coverage/**'
  ],
  noJsx: true,
  noStyle: true
})
