import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { UserRepository } from '@/modules/user/infrastructure/repositories/user.repository';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private redisClient: Redis,
    private userRepository: UserRepository
  ) {}

  async generateAccessToken(
    userId: string,
    email: string,
    roles: string[]
  ): Promise<{ access_token: string; expires_in: string }> {
    const expiresIn =
      this.configService.get<string>('auth.jwt_expiration') || '15m';
    const payload = {
      sub: userId,
      email,
      roles,
      typ: 'access',
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      expires_in: expiresIn,
    };
  }

  async generateRefreshToken(
    userId: string
  ): Promise<{ refresh_token: string; expires_in: string }> {
    const expiresIn =
      this.configService.get<string>('auth.jwt_refresh_expiration') || '7d';
    const jti = uuid();

    const payload = {
      sub: userId,
      jti,
      typ: 'refresh',
    };

    const token = this.jwtService.sign(payload);

    const ttlSeconds = this.parseTtl(expiresIn);
    await this.redisClient.setex(`rt:${userId}:${jti}`, ttlSeconds, '1');

    return {
      refresh_token: token,
      expires_in: expiresIn,
    };
  }

  async signin(
    email: string,
    password: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    user: any;
  }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = user.userRoles?.map((r) => r.role?.name) || [];

    const { access_token } = await this.generateAccessToken(
      user.id,
      user.email,
      roles
    );

    const { refresh_token } = await this.generateRefreshToken(user.id);

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
      },
    };
  }

  async rotateTokens(
    refreshToken: string
  ): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);

      if (payload.typ !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const userId = payload.sub;
      const jti = payload.jti;

      const rtKey = `rt:${userId}:${jti}`;
      const exists = await this.redisClient.exists(rtKey);

      if (!exists) {
        throw new UnauthorizedException('Refresh token revoked or expired');
      }

      await this.redisClient.del(rtKey);

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const roles = user.userRoles?.map((r) => r.role?.name) || [];

      const { access_token } = await this.generateAccessToken(
        user.id,
        user.email,
        roles
      );

      const { refresh_token } = await this.generateRefreshToken(user.id);

      return {
        access_token,
        refresh_token,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async revokeRefreshForUser(userId: string): Promise<void> {
    const pattern = `rt:${userId}:*`;
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }

  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roles = user.userRoles?.map((r) => r.role?.name) || [];

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.revokeRefreshForUser(userId);
  }

  private parseTtl(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600;
    }
  }
}
