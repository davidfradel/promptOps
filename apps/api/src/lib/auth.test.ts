import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret-key-for-testing' },
}));

import { hashPassword, comparePassword, signToken, verifyToken } from './auth.js';

describe('auth utils', () => {
  describe('hashPassword / comparePassword', () => {
    it('should hash a password and verify it', async () => {
      const password = 'my-secure-password';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$/);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject wrong password', async () => {
      const hash = await hashPassword('correct-password');
      const isValid = await comparePassword('wrong-password', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('signToken / verifyToken', () => {
    it('should sign and verify a token', () => {
      const token = signToken('user-123');
      expect(typeof token).toBe('string');

      const payload = verifyToken(token);
      expect(payload.userId).toBe('user-123');
    });

    it('should throw on invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });

    it('should throw on tampered token', () => {
      const token = signToken('user-123');
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyToken(tampered)).toThrow();
    });
  });
});
