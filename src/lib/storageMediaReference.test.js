import { describe, expect, test } from 'bun:test';
import { parseStorageMedia } from './storageMediaReference';

describe('private media references', () => {
  test('public and signed references share permanent cache identity', () => {
    const publicRef = parseStorageMedia('https://media.example/storage/v1/object/public/posts/user/photo.jpg');
    const signedRef = parseStorageMedia('https://media.example/storage/v1/object/sign/posts/user/photo.jpg?token=temporary');
    expect(signedRef?.cacheKey).toBe(publicRef?.cacheKey);
    expect(signedRef?.bucket).toBe('posts');
    expect(signedRef?.path).toBe('user/photo.jpg');
  });
  test('local previews never go through storage', () => {
    expect(parseStorageMedia('blob:http://localhost/local-preview')).toBeNull();
    expect(parseStorageMedia('data:image/png;base64,AA')).toBeNull();
  });
});