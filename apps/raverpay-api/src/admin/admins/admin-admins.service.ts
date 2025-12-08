import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { CreateAdminDto, UpdateAdminDto } from '../dto/admin.dto';

@Injectable()
export class AdminAdminsService {
  private readonly logger = new Logger(AdminAdminsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all admin users (ADMIN, SUPPORT, SUPER_ADMIN)
   */
  async getAdmins(
    page: number = 1,
    limit: number = 20,
    role?: UserRole,
    status?: UserStatus,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      role: {
        in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
      },
    };

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [admins, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: admins,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get admin statistics
   */
  async getStats() {
    const [total, byRole, byStatus] = await Promise.all([
      this.prisma.user.count({
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
          },
        },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
          },
        },
        _count: true,
      }),
      this.prisma.user.groupBy({
        by: ['status'],
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
          },
        },
        _count: true,
      }),
    ]);

    return {
      total,
      byRole: byRole.map((item) => ({
        role: item.role,
        count: item._count,
      })),
      byStatus: byStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
    };
  }

  /**
   * Get single admin by ID
   */
  async getAdminById(adminId: string) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: {
          in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
        },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return admin;
  }

  /**
   * Create new admin user
   * Only SUPER_ADMIN can create other admins
   */
  async createAdmin(requesterId: string, dto: CreateAdminDto) {
    // Check if requester is SUPER_ADMIN
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });

    if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can create admin users');
    }

    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check if phone already exists
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existingPhone) {
      throw new ConflictException('Phone number already exists');
    }

    // Validate role
    const validRoles: Array<'ADMIN' | 'SUPPORT' | 'SUPER_ADMIN'> = [
      'ADMIN',
      'SUPPORT',
      'SUPER_ADMIN',
    ];
    if (!validRoles.includes(dto.role)) {
      throw new ForbiddenException('Invalid role for admin user');
    }

    // Hash password
    const hashedPassword = await argon2.hash(dto.password);

    // Create admin user
    const admin = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        password: hashedPassword,
        role: dto.role,
        status: UserStatus.ACTIVE,
        emailVerified: true, // Admin accounts are pre-verified
        phoneVerified: true,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: requesterId,
        action: 'CREATE_ADMIN',
        resource: 'User',
        resourceId: admin.id,
        metadata: {
          adminEmail: admin.email,
          adminRole: admin.role,
        },
      },
    });

    this.logger.log(
      `Admin created: ${admin.email} (${admin.role}) by ${requester.email}`,
    );

    return admin;
  }

  /**
   * Update admin user
   */
  async updateAdmin(requesterId: string, adminId: string, dto: UpdateAdminDto) {
    // Check if requester is SUPER_ADMIN
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });

    if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can update admin users');
    }

    // Check if admin exists
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: {
          in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
        },
      },
    });

    if (!existingAdmin) {
      throw new NotFoundException('Admin not found');
    }

    // Prevent self-demotion
    if (
      adminId === requesterId &&
      dto.role &&
      dto.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Cannot demote yourself');
    }

    // Prevent self-deactivation
    if (
      adminId === requesterId &&
      dto.status &&
      dto.status !== UserStatus.ACTIVE
    ) {
      throw new ForbiddenException('Cannot deactivate yourself');
    }

    const admin = await this.prisma.user.update({
      where: { id: adminId },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.role && { role: dto.role }),
        ...(dto.status && { status: dto.status }),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: requesterId,
        action: 'UPDATE_ADMIN',
        resource: 'User',
        resourceId: admin.id,
        metadata: {
          changes: JSON.parse(JSON.stringify(dto)),
          adminEmail: admin.email,
        },
      },
    });

    return admin;
  }

  /**
   * Delete admin user (deactivate)
   */
  async deleteAdmin(requesterId: string, adminId: string) {
    // Check if requester is SUPER_ADMIN
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });

    if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can delete admin users');
    }

    // Prevent self-deletion
    if (adminId === requesterId) {
      throw new ForbiddenException('Cannot delete yourself');
    }

    // Check if admin exists
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: {
          in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
        },
      },
    });

    if (!existingAdmin) {
      throw new NotFoundException('Admin not found');
    }

    // Soft delete by setting status to BANNED
    await this.prisma.user.update({
      where: { id: adminId },
      data: { status: UserStatus.BANNED },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: requesterId,
        action: 'DELETE_ADMIN',
        resource: 'User',
        resourceId: adminId,
        metadata: {
          adminEmail: existingAdmin.email,
          adminRole: existingAdmin.role,
        },
      },
    });

    this.logger.log(
      `Admin deleted: ${existingAdmin.email} by ${requester.email}`,
    );

    return { success: true, message: 'Admin deactivated successfully' };
  }

  /**
   * Reset admin password
   */
  async resetPassword(
    requesterId: string,
    adminId: string,
    newPassword: string,
  ) {
    // Check if requester is SUPER_ADMIN
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });

    if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can reset admin passwords',
      );
    }

    // Check if admin exists
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: {
          in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
        },
      },
    });

    if (!existingAdmin) {
      throw new NotFoundException('Admin not found');
    }

    // Hash new password
    const hashedPassword = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: adminId },
      data: { password: hashedPassword },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: requesterId,
        action: 'RESET_ADMIN_PASSWORD',
        resource: 'User',
        resourceId: adminId,
        metadata: {
          adminEmail: existingAdmin.email,
        },
      },
    });

    return { success: true, message: 'Password reset successfully' };
  }
}
