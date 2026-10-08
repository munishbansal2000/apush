import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules', 'out', 'public', 'src/stubs'] },
  ...tseslint.configs.recommended,
  {
    plugins: { sonarjs },
    rules: {
      // catches `speaker === 'maya' ? 'maya-toon' : 'maya-toon'`
      'sonarjs/no-all-duplicated-branches': 'error',
      'sonarjs/no-identical-expressions': 'error',
      'sonarjs/no-identical-conditions': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_' }],
    },
  },
  {
    // Episode files are data. No turn-number logic, no hand-built audio/sequences.
    files: ['src/episodes/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: "BinaryExpression[operator=/^[!=]==?$/] > Literal[value=/^t\\d+$/]", message: 'Do not compare turn ids; anchor beats to script text.' },
        { selector: "Property[key.name='turnId']", message: 'turnId is gone; use at: { turn, word }.' },
        { selector: "Property[key.name='offset']", message: 'Offsets are measured, not typed; use at.word (and delay if needed).' },
        { selector: "CallExpression[callee.name='parseInt']", message: 'No turn-number arithmetic in episode files.' },
      ],
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'remotion', importNames: ['Audio', 'Sequence', 'useCurrentFrame'], message: 'Episodes are data; the EpisodeShell owns audio, sequencing, and time.' }] },
      ],
    },
  },
);
