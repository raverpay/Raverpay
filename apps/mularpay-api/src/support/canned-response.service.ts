import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCannedResponseDto, UpdateCannedResponseDto } from './dto';

@Injectable()
export class CannedResponseService {
  private readonly logger = new Logger(CannedResponseService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;

    return this.prisma.cannedResponse.findMany({
      where,
      orderBy: [{ category: 'asc' }, { usageCount: 'desc' }],
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        shortcut: true,
        usageCount: true,
      },
    });
  }

  async findById(responseId: string) {
    const response = await this.prisma.cannedResponse.findUnique({
      where: { id: responseId },
    });

    if (!response) {
      throw new NotFoundException('Canned response not found');
    }

    return response;
  }

  async findByShortcut(shortcut: string) {
    const response = await this.prisma.cannedResponse.findFirst({
      where: { shortcut, isActive: true },
    });

    if (!response) {
      throw new NotFoundException('Canned response not found');
    }

    return response;
  }

  async create(userId: string, dto: CreateCannedResponseDto) {
    try {
      const response = await this.prisma.cannedResponse.create({
        data: {
          title: dto.title,
          content: dto.content,
          category: dto.category,
          shortcut: dto.shortcut,
          createdById: userId,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Canned response "${response.title}" created by ${userId}`);

      return response;
    } catch (error) {
      this.logger.error('Error creating canned response:', error);
      throw error;
    }
  }

  async update(responseId: string, dto: UpdateCannedResponseDto) {
    const response = await this.prisma.cannedResponse.findUnique({
      where: { id: responseId },
    });

    if (!response) {
      throw new NotFoundException('Canned response not found');
    }

    return this.prisma.cannedResponse.update({
      where: { id: responseId },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });
  }

  async delete(responseId: string) {
    const response = await this.prisma.cannedResponse.findUnique({
      where: { id: responseId },
    });

    if (!response) {
      throw new NotFoundException('Canned response not found');
    }

    await this.prisma.cannedResponse.delete({
      where: { id: responseId },
    });

    this.logger.log(`Canned response "${response.title}" deleted`);

    return { success: true };
  }

  async incrementUsage(responseId: string) {
    const response = await this.prisma.cannedResponse.findUnique({
      where: { id: responseId },
    });

    if (!response) {
      throw new NotFoundException('Canned response not found');
    }

    await this.prisma.cannedResponse.update({
      where: { id: responseId },
      data: { usageCount: { increment: 1 } },
    });

    return { success: true };
  }

  async getCategories() {
    const categories = await this.prisma.cannedResponse.groupBy({
      by: ['category'],
      where: { isActive: true, category: { not: null } },
      _count: { category: true },
    });

    return categories.map((c) => ({
      category: c.category,
      count: c._count.category,
    }));
  }
}
