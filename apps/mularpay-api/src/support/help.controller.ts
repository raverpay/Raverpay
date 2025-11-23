import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { HelpService } from './help.service';
import { SearchHelpDto, MarkHelpfulDto } from './dto';

@Controller('help')
export class HelpController {
  constructor(private readonly helpService: HelpService) {}

  /**
   * Get all help collections
   * GET /help/collections
   */
  @Get('collections')
  async getCollections() {
    return this.helpService.getCollections(true);
  }

  /**
   * Get a collection with its articles
   * GET /help/collections/:id
   */
  @Get('collections/:id')
  async getCollection(@Param('id') collectionId: string) {
    return this.helpService.getCollectionById(collectionId, true);
  }

  /**
   * Get a single article by ID
   * GET /help/articles/:id
   */
  @Get('articles/:id')
  async getArticle(@Param('id') articleId: string) {
    // Increment view count
    await this.helpService.incrementArticleView(articleId);
    return this.helpService.getArticleById(articleId);
  }

  /**
   * Get article by slug
   * GET /help/articles/slug/:slug
   */
  @Get('articles/slug/:slug')
  async getArticleBySlug(@Param('slug') slug: string) {
    const article = await this.helpService.getArticleBySlug(slug);
    // Increment view count
    await this.helpService.incrementArticleView(article.id);
    return article;
  }

  /**
   * Search help articles
   * GET /help/search?q=query
   */
  @Get('search')
  async searchArticles(@Query() query: SearchHelpDto) {
    return this.helpService.searchArticles(query);
  }

  /**
   * Get popular articles
   * GET /help/popular
   */
  @Get('popular')
  async getPopularArticles(@Query('limit') limit?: number) {
    return this.helpService.getPopularArticles(limit);
  }

  /**
   * Mark article as helpful or not
   * POST /help/articles/:id/helpful
   */
  @Post('articles/:id/helpful')
  @HttpCode(HttpStatus.OK)
  async markHelpful(
    @Param('id') articleId: string,
    @Body() dto: MarkHelpfulDto,
  ) {
    return this.helpService.markArticleHelpful(articleId, dto.helpful);
  }

  /**
   * Increment article view (explicit call)
   * POST /help/articles/:id/view
   */
  @Post('articles/:id/view')
  @HttpCode(HttpStatus.OK)
  async incrementView(@Param('id') articleId: string) {
    return this.helpService.incrementArticleView(articleId);
  }
}
