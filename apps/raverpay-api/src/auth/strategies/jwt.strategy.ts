import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

/**
 * JWT Strategy
 *
 * Validates JWT tokens and extracts user information
 * Used by the JwtAuthGuard to protect routes
 */
interface JwtPayload {
  sub: string;
  email: string;
  phone: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
      ignoreExpiration: false,
    });
  }

  /**
   * Validate JWT payload
   * Called automatically by Passport after JWT verification
   *
   * @param payload - Decoded JWT payload
   * @returns User object (attached to request.user)
   */
  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
