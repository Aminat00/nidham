/**
 * Jest — pure-logic tests only (node env). We unit-test the plain TypeScript in
 * src/ (triage, project math, plan flatten, fallbacks); React Native components are
 * verified in the Expo web preview, not here. `isolatedModules` skips full
 * type-checking during tests (that's what `npm run typecheck` is for) and keeps the
 * run fast and free of unrelated cross-file type noise.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true }],
  },
};
