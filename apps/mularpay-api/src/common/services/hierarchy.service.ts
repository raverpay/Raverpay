import { Injectable, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HierarchyService {
  // Define role hierarchy levels
  private readonly roleHierarchy: Record<UserRole, number> = {
    [UserRole.USER]: 0,
    [UserRole.SUPPORT]: 1,
    [UserRole.ADMIN]: 2,
    [UserRole.SUPER_ADMIN]: 3,
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Get the hierarchy level of a role
   */
  getRoleLevel(role: UserRole): number {
    return this.roleHierarchy[role];
  }

  /**
   * Check if adminRole can modify targetRole
   * Rule: Cannot modify users with equal or higher role
   */
  canModifyRole(adminRole: UserRole, targetRole: UserRole): boolean {
    return this.getRoleLevel(adminRole) > this.getRoleLevel(targetRole);
  }

  /**
   * Check if adminRole can elevate a user to targetRole
   * Rule: Cannot elevate users to a role equal or higher than your own
   */
  canElevateToRole(adminRole: UserRole, targetRole: UserRole): boolean {
    return this.getRoleLevel(adminRole) > this.getRoleLevel(targetRole);
  }

  /**
   * Validate if admin can modify target user
   * Throws ForbiddenException if not allowed
   */
  async validateCanModifyUser(
    adminUserId: string,
    targetUserId: string,
  ): Promise<void> {
    // Cannot modify yourself
    if (adminUserId === targetUserId) {
      throw new ForbiddenException(
        'You cannot modify your own account through admin endpoints',
      );
    }

    // Get both users
    const [admin, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: adminUserId } }),
      this.prisma.user.findUnique({ where: { id: targetUserId } }),
    ]);

    if (!admin || !target) {
      throw new ForbiddenException('User not found');
    }

    // Check hierarchy
    if (!this.canModifyRole(admin.role, target.role)) {
      throw new ForbiddenException(
        `You cannot modify users with ${target.role} role`,
      );
    }
  }

  /**
   * Validate if admin can change target user's role to newRole
   */
  async validateCanChangeRole(
    adminUserId: string,
    targetUserId: string,
    newRole: UserRole,
  ): Promise<void> {
    // Cannot change your own role
    if (adminUserId === targetUserId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    // Get both users
    const [admin, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: adminUserId } }),
      this.prisma.user.findUnique({ where: { id: targetUserId } }),
    ]);

    if (!admin || !target) {
      throw new ForbiddenException('User not found');
    }

    // Check if admin can modify this user
    if (!this.canModifyRole(admin.role, target.role)) {
      throw new ForbiddenException(
        `You cannot modify users with ${target.role} role`,
      );
    }

    // Check if admin can elevate to the new role
    if (!this.canElevateToRole(admin.role, newRole)) {
      throw new ForbiddenException(
        `You cannot elevate users to ${newRole} role`,
      );
    }
  }

  /**
   * Validate that at least one SUPER_ADMIN exists
   * Used before deleting or demoting a SUPER_ADMIN
   */
  async ensureSuperAdminExists(excludeUserId?: string): Promise<void> {
    const superAdminCount = await this.prisma.user.count({
      where: {
        role: UserRole.SUPER_ADMIN,
        ...(excludeUserId && { id: { not: excludeUserId } }),
      },
    });

    if (superAdminCount === 0) {
      throw new ForbiddenException(
        'Cannot perform this action: At least one SUPER_ADMIN must exist in the system',
      );
    }
  }

  /**
   * Check if user is SUPER_ADMIN
   */
  isSuperAdmin(role: UserRole): boolean {
    return role === UserRole.SUPER_ADMIN;
  }

  /**
   * Check if user is ADMIN or higher
   */
  isAdminOrHigher(role: UserRole): boolean {
    return this.getRoleLevel(role) >= this.getRoleLevel(UserRole.ADMIN);
  }

  /**
   * Check if user is SUPPORT or higher
   */
  isSupportOrHigher(role: UserRole): boolean {
    return this.getRoleLevel(role) >= this.getRoleLevel(UserRole.SUPPORT);
  }
}
