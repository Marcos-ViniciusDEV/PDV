import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authService from '../../electron/services/auth.service';
import * as usersRepository from '../../electron/repositories/users.repository';

// Mock the users repository
vi.mock('../../electron/repositories/users.repository', () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  getAllUsers: vi.fn(),
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user data for valid credentials', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        passwordHash: 'password123', // Plain text without prefix
      };

      vi.mocked(usersRepository.getUserByEmail).mockResolvedValue(mockUser);

      const result = await authService.validateUser('test@example.com', 'password123');

      expect(result).toEqual({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      });
    });

    it('should return null for invalid email', async () => {
      vi.mocked(usersRepository.getUserByEmail).mockResolvedValue(null);

      const result = await authService.validateUser('invalid@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        passwordHash: 'password123',
      };

      vi.mocked(usersRepository.getUserByEmail).mockResolvedValue(mockUser);

      const result = await authService.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should return null for user without password hash', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        passwordHash: null,
      };

      vi.mocked(usersRepository.getUserByEmail).mockResolvedValue(mockUser as any);

      const result = await authService.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('should return users without password hash', async () => {
      const mockUsers = [
        {
          id: 1,
          name: 'User 1',
          email: 'user1@example.com',
          role: 'user',
          passwordHash: 'hash1',
        },
        {
          id: 2,
          name: 'User 2',
          email: 'user2@example.com',
          role: 'admin',
          passwordHash: 'hash2',
        },
      ];

      vi.mocked(usersRepository.getAllUsers).mockResolvedValue(mockUsers);

      const result = await authService.getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('passwordHash');
      expect(result[1]).not.toHaveProperty('passwordHash');
      expect(result[0]).toEqual({
        id: 1,
        name: 'User 1',
        email: 'user1@example.com',
        role: 'user',
      });
    });
  });
});
