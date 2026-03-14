import { AuthService } from '../../../src/services/AuthService';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Create mocks BEFORE importing AuthService
const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  organization: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  organizationMember: {
    findUnique: jest.fn(),
  },
  projectMember: {
    findUnique: jest.fn(),
  },
};

const redisMock = {
  get: jest.fn(),
  setex: jest.fn(),
};

// Mock the dependencies
jest.mock('../../../src/config/database', () => ({
  getPrisma: () => prismaMock,
}));

jest.mock('../../../src/config/redis', () => ({
  getRedis: () => redisMock,
  getRedisOptional: () => redisMock,
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const email = 'test@example.com';
      const name = 'Test User';
      const password = 'SecurePass123!';
      const orgName = 'Test Org';

      // Mock responses
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed_password');
      
      prismaMock.organization.findUnique.mockResolvedValueOnce(null);

      const mockOrg = { id: 'org-1', name: orgName, slug: 'test-org' };
      prismaMock.organization.create.mockResolvedValueOnce(mockOrg);

      const mockUser = {
        id: 'user-1',
        email,
        name,
        passwordHash: 'hashed_password',
        role: 'OWNER',
        organizationMembers: [{ organizationId: 'org-1', role: 'OWNER' }],
      };
      prismaMock.user.create.mockResolvedValueOnce(mockUser);

      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      const result = await authService.register(email, name, password, orgName);

      expect(result.user.email).toBe(email);
      expect(result.user.name).toBe(name);
      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('refresh_token');
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it('should throw error if user already exists', async () => {
      const email = 'existing@example.com';

      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email,
      });

      await expect(
        authService.register(email, 'Test', 'SecurePass123!', 'Org')
      ).rejects.toThrow('User with this email already exists');
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const email = 'test@example.com';
      const password = 'SecurePass123!';

      const mockUser = {
        id: 'user-1',
        email,
        name: 'Test User',
        passwordHash: 'hashed_password',
        role: 'QA_ENGINEER',
        organizationMembers: [{ organizationId: 'org-1', role: 'QA_ENGINEER' }],
      };

      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      prismaMock.user.update.mockResolvedValueOnce(mockUser);

      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      const result = await authService.login(email, password);

      expect(result.user.email).toBe(email);
      expect(result.accessToken).toBe('access_token');
      expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hashed_password');
    });

    it('should throw error with invalid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        authService.login('nonexistent@example.com', 'password')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error with wrong password', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
      };

      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid token', () => {
      const token = 'valid_token';
      const payload = {
        userId: 'user-1',
        email: 'test@example.com',
        roles: ['QA_ENGINEER'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      (jwt.verify as jest.Mock).mockReturnValueOnce(payload);

      const result = authService.verifyAccessToken(token);

      expect(result.userId).toBe('user-1');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw error on expired token', () => {
      const token = 'expired_token';

      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      expect(() => authService.verifyAccessToken(token)).toThrow(
        'Access token has expired'
      );
    });

    it('should throw error on invalid token', () => {
      const token = 'invalid_token';

      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      expect(() => authService.verifyAccessToken(token)).toThrow(
        'Invalid access token'
      );
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      const userId = 'user-1';
      const tokenVersion = 1;

      await authService.logout(userId, tokenVersion);

      expect(redisMock.setex).toHaveBeenCalledWith(
        `revoked:${userId}:${tokenVersion}`,
        7 * 24 * 60 * 60,
        'revoked'
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = 'user-1';
      const currentPassword = 'OldPass123!';
      const newPassword = 'NewPass456!';

      const mockUser = {
        id: userId,
        passwordHash: 'old_hash',
      };

      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('new_hash');
      prismaMock.user.update.mockResolvedValueOnce({
        ...mockUser,
        passwordHash: 'new_hash',
      });

      await authService.changePassword(userId, currentPassword, newPassword);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { passwordHash: 'new_hash' },
      });
    });

    it('should throw error with wrong current password', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: 'old_hash',
      };

      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        authService.changePassword('user-1', 'WrongPass123!', 'NewPass456!')
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('checkProjectPermission', () => {
    it('should grant permission for authorized user', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';

      prismaMock.projectMember.findUnique.mockResolvedValueOnce({
        role: 'QA_ENGINEER',
      });

      const hasPermission = await authService.checkProjectPermission(
        userId,
        projectId,
        'create'
      );

      expect(hasPermission).toBe(true);
    });

    it('should deny permission for unauthorized user', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';

      prismaMock.projectMember.findUnique.mockResolvedValueOnce({
        role: 'VIEWER',
      });

      const hasPermission = await authService.checkProjectPermission(
        userId,
        projectId,
        'create'
      );

      expect(hasPermission).toBe(false);
    });

    it('should deny permission if user not in project', async () => {
      prismaMock.projectMember.findUnique.mockResolvedValueOnce(null);

      const hasPermission = await authService.checkProjectPermission(
        'user-1',
        'project-1',
        'read'
      );

      expect(hasPermission).toBe(false);
    });
  });
});
