import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateHelpCollectionDto,
  UpdateHelpCollectionDto,
  CreateHelpArticleDto,
  UpdateHelpArticleDto,
  SearchHelpDto,
} from './dto';

@Injectable()
export class HelpService {
  private readonly logger = new Logger(HelpService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================
  // COLLECTIONS
  // ============================================

  async getCollections(activeOnly: boolean = true) {
    const where = activeOnly ? { isActive: true } : {};

    return this.prisma.helpCollection.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });
  }

  async getCollectionById(
    collectionId: string,
    includeArticles: boolean = true,
  ) {
    const collection = await this.prisma.helpCollection.findUnique({
      where: { id: collectionId },
      include: includeArticles
        ? {
            articles: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            },
          }
        : undefined,
    });

    if (!collection) {
      throw new NotFoundException('Help collection not found');
    }

    return collection;
  }

  async createCollection(dto: CreateHelpCollectionDto) {
    try {
      // Get the max order
      const maxOrder = await this.prisma.helpCollection.aggregate({
        _max: { order: true },
      });

      const collection = await this.prisma.helpCollection.create({
        data: {
          title: dto.title,
          description: dto.description,
          icon: dto.icon,
          order: dto.order ?? (maxOrder._max.order ?? 0) + 1,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Help collection "${collection.title}" created`);

      return collection;
    } catch (error) {
      this.logger.error('Error creating help collection:', error);
      throw error;
    }
  }

  async updateCollection(collectionId: string, dto: UpdateHelpCollectionDto) {
    const collection = await this.prisma.helpCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException('Help collection not found');
    }

    return this.prisma.helpCollection.update({
      where: { id: collectionId },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });
  }

  async deleteCollection(collectionId: string) {
    const collection = await this.prisma.helpCollection.findUnique({
      where: { id: collectionId },
      include: { _count: { select: { articles: true } } },
    });

    if (!collection) {
      throw new NotFoundException('Help collection not found');
    }

    // Delete the collection (cascade will delete articles)
    await this.prisma.helpCollection.delete({
      where: { id: collectionId },
    });

    this.logger.log(
      `Help collection "${collection.title}" deleted with ${collection._count.articles} articles`,
    );

    return { success: true };
  }

  // ============================================
  // ARTICLES
  // ============================================

  async getArticleById(articleId: string) {
    const article = await this.prisma.helpArticle.findUnique({
      where: { id: articleId },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Help article not found');
    }

    return article;
  }

  async getArticleBySlug(slug: string) {
    const article = await this.prisma.helpArticle.findUnique({
      where: { slug },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Help article not found');
    }

    return article;
  }

  async createArticle(dto: CreateHelpArticleDto) {
    try {
      // Verify collection exists
      const collection = await this.prisma.helpCollection.findUnique({
        where: { id: dto.collectionId },
      });

      if (!collection) {
        throw new NotFoundException('Help collection not found');
      }

      // Generate slug if not provided
      const slug = dto.slug || this.generateSlug(dto.title);

      // Check slug uniqueness
      const existingArticle = await this.prisma.helpArticle.findUnique({
        where: { slug },
      });

      if (existingArticle) {
        throw new ConflictException('Article with this slug already exists');
      }

      // Get max order within collection
      const maxOrder = await this.prisma.helpArticle.aggregate({
        where: { collectionId: dto.collectionId },
        _max: { order: true },
      });

      const article = await this.prisma.helpArticle.create({
        data: {
          collectionId: dto.collectionId,
          title: dto.title,
          content: dto.content,
          slug,
          order: dto.order ?? (maxOrder._max.order ?? 0) + 1,
          isActive: dto.isActive ?? false, // Default to draft/inactive
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Help article "${article.title}" created`);

      return {
        ...article,
        status: article.isActive ? ('PUBLISHED' as const) : ('DRAFT' as const),
      };
    } catch (error) {
      this.logger.error('Error creating help article:', error);
      throw error;
    }
  }

  async updateArticle(articleId: string, dto: UpdateHelpArticleDto) {
    const article = await this.prisma.helpArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Help article not found');
    }

    // Verify new collection exists if changing collection
    if (dto.collectionId && dto.collectionId !== article.collectionId) {
      const collection = await this.prisma.helpCollection.findUnique({
        where: { id: dto.collectionId },
      });

      if (!collection) {
        throw new NotFoundException('Help collection not found');
      }
    }

    // Check slug uniqueness if updating slug
    if (dto.slug && dto.slug !== article.slug) {
      const existingArticle = await this.prisma.helpArticle.findUnique({
        where: { slug: dto.slug },
      });

      if (existingArticle) {
        throw new ConflictException('Article with this slug already exists');
      }
    }

    const updated = await this.prisma.helpArticle.update({
      where: { id: articleId },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });

    return {
      ...updated,
      status: updated.isActive ? ('PUBLISHED' as const) : ('DRAFT' as const),
    };
  }

  async deleteArticle(articleId: string) {
    const article = await this.prisma.helpArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Help article not found');
    }

    await this.prisma.helpArticle.delete({
      where: { id: articleId },
    });

    this.logger.log(`Help article "${article.title}" deleted`);

    return { success: true };
  }

  async getArticles(params: {
    page?: number;
    limit?: number;
    collectionId?: string;
    search?: string;
    status?: 'DRAFT' | 'PUBLISHED';
  }) {
    const { page = 1, limit = 10, collectionId, search, status } = params;

    const where: any = {};

    if (collectionId) {
      where.collectionId = collectionId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'DRAFT') {
      where.isActive = false;
    } else if (status === 'PUBLISHED') {
      where.isActive = true;
    }

    const [articles, total] = await Promise.all([
      this.prisma.helpArticle.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        include: {
          collection: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      this.prisma.helpArticle.count({ where }),
    ]);

    // Map isActive to status for frontend compatibility
    const articlesWithStatus = articles.map((article) => ({
      ...article,
      status: article.isActive ? ('PUBLISHED' as const) : ('DRAFT' as const),
    }));

    return {
      data: articlesWithStatus,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async publishArticle(articleId: string) {
    const article = await this.prisma.helpArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Help article not found');
    }

    const updated = await this.prisma.helpArticle.update({
      where: { id: articleId },
      data: {
        isActive: true,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Help article "${article.title}" published`);

    return {
      ...updated,
      status: 'PUBLISHED' as const,
    };
  }

  async unpublishArticle(articleId: string) {
    const article = await this.prisma.helpArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Help article not found');
    }

    const updated = await this.prisma.helpArticle.update({
      where: { id: articleId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Help article "${article.title}" unpublished`);

    return {
      ...updated,
      status: 'DRAFT' as const,
    };
  }

  // ============================================
  // SEARCH & ANALYTICS
  // ============================================

  async searchArticles(dto: SearchHelpDto) {
    const { query, limit = 10 } = dto;

    const articles = await this.prisma.helpArticle.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { viewCount: 'desc' },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return articles;
  }

  async incrementArticleView(articleId: string) {
    await this.prisma.helpArticle.update({
      where: { id: articleId },
      data: { viewCount: { increment: 1 } },
    });

    return { success: true };
  }

  async markArticleHelpful(articleId: string, helpful: boolean) {
    const article = await this.prisma.helpArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Help article not found');
    }

    await this.prisma.helpArticle.update({
      where: { id: articleId },
      data: helpful
        ? { helpfulCount: { increment: 1 } }
        : { unhelpfulCount: { increment: 1 } },
    });

    return { success: true };
  }

  async getPopularArticles(limit: number = 5) {
    return this.prisma.helpArticle.findMany({
      where: { isActive: true },
      orderBy: { viewCount: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        collection: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }
}
