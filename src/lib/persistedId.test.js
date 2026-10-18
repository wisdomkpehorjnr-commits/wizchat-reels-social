import { test, expect } from 'bun:test';
import { isPersistedId } from './persistedId.ts';

test('pending topic posts are excluded from UUID-backed interactions', () => {
  expect(isPersistedId('temp-1792328868521')).toBe(false);
  expect(isPersistedId('eaf095d4-ceea-4f27-8a14-acf642b45c93')).toBe(true);
});