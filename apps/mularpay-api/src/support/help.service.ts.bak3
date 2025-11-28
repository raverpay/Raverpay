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
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Help article "${article.title}" created`);

      return article;
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

    // Check slug uniqueness if updating slug
    if (dto.slug && dto.slug !== article.slug) {
      const existingArticle = await this.prisma.helpArticle.findUnique({
        where: { slug: dto.slug },
      });

      if (existingArticle) {
        throw new ConflictException('Article with this slug already exists');
      }
    }

    return this.prisma.helpArticle.update({
      where: { id: articleId },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });
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
