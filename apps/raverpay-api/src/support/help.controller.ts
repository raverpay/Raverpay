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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { HelpService } from './help.service';
import { SearchHelpDto, MarkHelpfulDto } from './dto';

@ApiTags('Help Center')
@Controller('help')
export class HelpController {
  constructor(private readonly helpService: HelpService) {}

  /**
   * Get all help collections
   * GET /help/collections
   */
  @Get('collections')
  @ApiOperation({
    summary: 'Get Collections',
    description: 'List all help collections',
  })
  @ApiResponse({ status: 200, description: 'Collections retrieved' })
  async getCollections() {
    return this.helpService.getCollections(true);
  }

  /**
   * Get a collection with its articles
   * GET /help/collections/:id
   */
  @Get('collections/:id')
  @ApiOperation({
    summary: 'Get Collection',
    description: 'Get a specific collection with articles',
  })
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiResponse({ status: 200, description: 'Collection retrieved' })
  async getCollection(@Param('id') collectionId: string) {
    return this.helpService.getCollectionById(collectionId, true);
  }

  /**
   * Get a single article by ID
   * GET /help/articles/:id
   */
  @Get('articles/:id')
  @ApiOperation({
    summary: 'Get Article',
    description: 'Get article details by ID',
  })
  @ApiParam({ name: 'id', description: 'Article ID' })
  @ApiResponse({ status: 200, description: 'Article retrieved' })
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
  @ApiOperation({
    summary: 'Get Article by Slug',
    description: 'Get article details by slug',
  })
  @ApiParam({ name: 'slug', description: 'Article Slug' })
  @ApiResponse({ status: 200, description: 'Article retrieved' })
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
  @ApiOperation({
    summary: 'Search Articles',
    description: 'Search for articles',
  })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchArticles(@Query() query: SearchHelpDto) {
    return this.helpService.searchArticles(query);
  }

  /**
   * Get popular articles
   * GET /help/popular
   */
  @Get('popular')
  @ApiOperation({
    summary: 'Get Popular Articles',
    description: 'Get most viewed articles',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Popular articles retrieved' })
  async getPopularArticles(@Query('limit') limit?: number) {
    return this.helpService.getPopularArticles(limit);
  }

  /**
   * Mark article as helpful or not
   * POST /help/articles/:id/helpful
   */
  @Post('articles/:id/helpful')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark Helpful',
    description: 'Vote if article was helpful',
  })
  @ApiParam({ name: 'id', description: 'Article ID' })
  @ApiResponse({ status: 200, description: 'Vote recorded' })
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
  @ApiOperation({
    summary: 'Increment View',
    description: 'Explicitly increment article view count',
  })
  @ApiParam({ name: 'id', description: 'Article ID' })
  @ApiResponse({ status: 200, description: 'View count incremented' })
  async incrementView(@Param('id') articleId: string) {
    return this.helpService.incrementArticleView(articleId);
  }
}
