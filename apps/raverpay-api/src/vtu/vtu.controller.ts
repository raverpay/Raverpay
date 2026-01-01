import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Idempotent } from '../common/decorators/idempotent.decorator';
import { VTUService } from './vtu.service';
import {
  PurchaseAirtimeDto,
  PurchaseDataDto,
  PayCableTVDto,
  PayShowmaxDto,
  PayElectricityDto,
  VerifySmartcardDto,
  VerifyMeterDto,
  GetOrdersDto,
  PurchaseInternationalAirtimeDto,
  GetSavedRecipientsDto,
  UpdateSavedRecipientDto,
  VerifyJAMBProfileDto,
  PurchaseJAMBPinDto,
  PurchaseWAECRegistrationDto,
  PurchaseWAECResultDto,
} from './dto';

@ApiTags('VTU')
@ApiBearerAuth()
@Controller('vtu')
@UseGuards(JwtAuthGuard)
export class VTUController {
  constructor(private readonly vtuService: VTUService) {}

  // ==================== Product Catalog ====================

  @Get('airtime/providers')
  @ApiOperation({
    summary: 'Get airtime providers',
    description: 'List supported airtime providers',
  })
  @ApiResponse({ status: 200, description: 'Providers list retrieved' })
  @HttpCode(HttpStatus.OK)
  getAirtimeProviders() {
    return this.vtuService.getAirtimeProviders();
  }

  @Get('data/plans/:network')
  @ApiOperation({
    summary: 'Get data plans',
    description: 'List data plans for specific network',
  })
  @ApiParam({
    name: 'network',
    description: 'Network provider (MTN, GLO, etc.)',
  })
  @ApiResponse({ status: 200, description: 'Data plans retrieved' })
  @HttpCode(HttpStatus.OK)
  getDataPlans(@Param('network') network: string) {
    return this.vtuService.getDataPlans(network);
  }

  @Get('data/sme-plans/:network')
  @ApiOperation({
    summary: 'Get SME data plans',
    description: 'List SME data plans (e.g. for GLO)',
  })
  @ApiParam({ name: 'network', description: 'Network provider' })
  @ApiResponse({ status: 200, description: 'SME plans retrieved' })
  @HttpCode(HttpStatus.OK)
  getSMEDataPlans(@Param('network') network: string) {
    return this.vtuService.getSMEDataPlans(network);
  }

  @Get('cable-tv/plans/:provider')
  @ApiOperation({
    summary: 'Get Cable TV plans',
    description: 'List bouquets/plans for Cable TV provider',
  })
  @ApiParam({
    name: 'provider',
    description: 'Provider (DSTV, GOTV, STARTIMES)',
  })
  @ApiResponse({ status: 200, description: 'Plans retrieved' })
  @HttpCode(HttpStatus.OK)
  getCableTVPlans(@Param('provider') provider: string) {
    return this.vtuService.getCableTVPlans(provider);
  }

  @Get('electricity/providers')
  @ApiOperation({
    summary: 'Get electricity providers',
    description: 'List electricity distribution companies (Discos)',
  })
  @ApiResponse({ status: 200, description: 'Providers retrieved' })
  @HttpCode(HttpStatus.OK)
  getElectricityProviders() {
    return this.vtuService.getElectricityProviders();
  }

  // ==================== International Airtime/Data Catalog ====================

  @Get('international/countries')
  @ApiOperation({
    summary: 'Get international countries',
    description: 'List supported countries for international top-up',
  })
  @ApiResponse({ status: 200, description: 'Countries retrieved' })
  @HttpCode(HttpStatus.OK)
  getInternationalCountries() {
    return this.vtuService.getInternationalCountries();
  }

  @Get('international/product-types/:countryCode')
  @ApiOperation({
    summary: 'Get international product types',
    description: 'List product types for a country (e.g. Mobile Top-up, Data)',
  })
  @ApiParam({
    name: 'countryCode',
    description: 'ISO country code (e.g. GH, ZAR)',
  })
  @ApiResponse({ status: 200, description: 'Product types retrieved' })
  @HttpCode(HttpStatus.OK)
  getInternationalProductTypes(@Param('countryCode') countryCode: string) {
    return this.vtuService.getInternationalProductTypes(countryCode);
  }

  @Get('international/operators/:countryCode/:productTypeId')
  @ApiOperation({
    summary: 'Get international operators',
    description: 'List operators for a country and product type',
  })
  @ApiParam({ name: 'countryCode', description: 'ISO country code' })
  @ApiParam({ name: 'productTypeId', description: 'Product type ID' })
  @ApiResponse({ status: 200, description: 'Operators retrieved' })
  @HttpCode(HttpStatus.OK)
  getInternationalOperators(
    @Param('countryCode') countryCode: string,
    @Param('productTypeId') productTypeId: string,
  ) {
    return this.vtuService.getInternationalOperators(
      countryCode,
      productTypeId,
    );
  }

  @Get('international/variations/:operatorId/:productTypeId')
  @ApiOperation({
    summary: 'Get international variations',
    description: 'List amounts/packages for an operator',
  })
  @ApiParam({ name: 'operatorId', description: 'Operator ID' })
  @ApiParam({ name: 'productTypeId', description: 'Product type ID' })
  @ApiResponse({ status: 200, description: 'Variations retrieved' })
  @HttpCode(HttpStatus.OK)
  getInternationalVariations(
    @Param('operatorId') operatorId: string,
    @Param('productTypeId') productTypeId: string,
  ) {
    return this.vtuService.getInternationalVariations(
      operatorId,
      productTypeId,
    );
  }

  // ==================== Validation ====================

  @Post('cable-tv/verify')
  @ApiOperation({
    summary: 'Verify smartcard',
    description: 'Verify Cable TV smartcard or IUC number',
  })
  @ApiResponse({ status: 200, description: 'Smartcard details verified' })
  @ApiResponse({ status: 400, description: 'Invalid smartcard number' })
  @HttpCode(HttpStatus.OK)
  verifySmartcard(@Body() dto: VerifySmartcardDto) {
    return this.vtuService.validateSmartcard(dto.smartcardNumber, dto.provider);
  }

  @Post('electricity/verify')
  @ApiOperation({
    summary: 'Verify meter number',
    description: 'Verify electricity meter number',
  })
  @ApiResponse({ status: 200, description: 'Meter details verified' })
  @ApiResponse({ status: 400, description: 'Invalid meter number' })
  @HttpCode(HttpStatus.OK)
  verifyMeterNumber(@Body() dto: VerifyMeterDto) {
    return this.vtuService.validateMeterNumber(
      dto.meterNumber,
      dto.disco,
      dto.meterType,
    );
  }

  // ==================== Purchases ====================

  @Throttle({
    default: { limit: 30, ttl: 3600000 }, // 30 airtime purchases per hour
    burst: { limit: 1, ttl: 5000 }, // NEW: Burst limit 1 per 5s
  })
  @Post('airtime/purchase')
  @HttpCode(HttpStatus.CREATED)
  @Idempotent()
  @ApiOperation({
    summary: 'Purchase airtime',
    description: 'Buy airtime for any Nigerian network',
  })
  @ApiResponse({ status: 201, description: 'Airtime purchase successful' })
  @ApiResponse({ status: 400, description: 'Invalid phone number or amount' })
  purchaseAirtime(
    @GetUser('id') userId: string,
    @Body() dto: PurchaseAirtimeDto,
  ) {
    return this.vtuService.purchaseAirtime(userId, dto);
  }

  @Throttle({
    default: { limit: 30, ttl: 3600000 }, // 30 data purchases per hour
    burst: { limit: 1, ttl: 5000 }, // NEW: Burst limit 1 per 5s
  })
  @Post('data/purchase')
  @HttpCode(HttpStatus.CREATED)
  @Idempotent()
  @ApiOperation({
    summary: 'Purchase data bundle',
    description: 'Buy data bundle for any Nigerian network',
  })
  @ApiResponse({ status: 201, description: 'Data purchase successful' })
  purchaseData(@GetUser('id') userId: string, @Body() dto: PurchaseDataDto) {
    return this.vtuService.purchaseDataBundle(userId, dto);
  }

  @Throttle({
    default: { limit: 20, ttl: 3600000 }, // 20 cable TV payments per hour
    burst: { limit: 1, ttl: 5000 }, // NEW: Burst limit 1 per 5s
  })
  @Post('cable-tv/pay')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Pay Cable TV',
    description: 'Subscribe to DSTV, GOTV, or StarTimes',
  })
  @ApiResponse({ status: 201, description: 'Subscription successful' })
  payCableTVSubscription(
    @GetUser('id') userId: string,
    @Body() dto: PayCableTVDto,
  ) {
    return this.vtuService.payCableTVSubscription(userId, dto);
  }

  @Get('showmax/plans')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Showmax plans',
    description: 'List available Showmax subscription plans',
  })
  @ApiResponse({ status: 200, description: 'Plans retrieved' })
  getShowmaxPlans() {
    return this.vtuService.getShowmaxPlans();
  }

  @Post('showmax/pay')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Pay Showmax', description: 'Subscribe to Showmax' })
  @ApiResponse({ status: 201, description: 'Subscription successful' })
  payShowmaxSubscription(
    @GetUser('id') userId: string,
    @Body() dto: PayShowmaxDto,
  ) {
    return this.vtuService.payShowmaxSubscription(userId, dto);
  }

  @Throttle({
    default: { limit: 20, ttl: 3600000 }, // 20 electricity payments per hour
    burst: { limit: 1, ttl: 5000 }, // NEW: Burst limit 1 per 5s
  })
  @Post('electricity/pay')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Pay Electricity',
    description: 'Pay electricity bill (Prepaid/Postpaid)',
  })
  @ApiResponse({ status: 201, description: 'Payment successful' })
  payElectricityBill(
    @GetUser('id') userId: string,
    @Body() dto: PayElectricityDto,
  ) {
    return this.vtuService.payElectricityBill(userId, dto);
  }

  @Post('international/purchase')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Purchase international airtime',
    description: 'Buy airtime for international numbers',
  })
  @ApiResponse({ status: 201, description: 'Purchase successful' })
  purchaseInternationalAirtime(
    @GetUser('id') userId: string,
    @Body() dto: PurchaseInternationalAirtimeDto,
  ) {
    return this.vtuService.purchaseInternationalAirtime(userId, dto);
  }

  // ==================== Education Services ====================

  @Get('education/jamb/variations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get JAMB variations',
    description: 'List JAMB product types (UTME, Direct Entry)',
  })
  @ApiResponse({ status: 200, description: 'Variations retrieved' })
  getJAMBVariations() {
    return this.vtuService.getJAMBVariations();
  }

  @Get('education/waec-registration/variations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get WAEC Registration variations',
    description: 'List WAEC registration product types',
  })
  @ApiResponse({ status: 200, description: 'Variations retrieved' })
  getWAECRegistrationVariations() {
    return this.vtuService.getWAECRegistrationVariations();
  }

  @Get('education/waec-result/variations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get WAEC Result variations',
    description: 'List WAEC result checker product types',
  })
  @ApiResponse({ status: 200, description: 'Variations retrieved' })
  getWAECResultVariations() {
    return this.vtuService.getWAECResultVariations();
  }

  @Post('education/jamb/verify-profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify JAMB Profile',
    description: 'Verify JAMB profile ID',
  })
  @ApiResponse({ status: 200, description: 'Profile verified' })
  @ApiResponse({ status: 400, description: 'Invalid profile ID' })
  verifyJAMBProfile(@Body() dto: VerifyJAMBProfileDto) {
    return this.vtuService.verifyJAMBProfile(dto.profileId, dto.variationCode);
  }

  @Throttle({
    default: { limit: 10, ttl: 3600000 }, // 10 JAMB purchases per hour
    burst: { limit: 1, ttl: 5000 }, // NEW: Burst limit 1 per 5s
  })
  @Post('education/jamb/purchase')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Purchase JAMB PIN',
    description: 'Buy JAMB UTME/Direct Entry PIN',
  })
  @ApiResponse({ status: 201, description: 'Purchase successful' })
  purchaseJAMBPin(
    @GetUser('id') userId: string,
    @Body() dto: PurchaseJAMBPinDto,
  ) {
    return this.vtuService.purchaseJAMBPin(userId, dto);
  }

  @Throttle({
    default: { limit: 10, ttl: 3600000 }, // 10 WAEC purchases per hour
    burst: { limit: 1, ttl: 5000 }, // NEW: Burst limit 1 per 5s
  })
  @Post('education/waec-registration/purchase')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Purchase WAEC Registration',
    description: 'Buy WAEC registration PIN',
  })
  @ApiResponse({ status: 201, description: 'Purchase successful' })
  purchaseWAECRegistration(
    @GetUser('id') userId: string,
    @Body() dto: PurchaseWAECRegistrationDto,
  ) {
    return this.vtuService.purchaseWAECRegistration(userId, dto);
  }

  @Throttle({
    default: { limit: 10, ttl: 3600000 }, // 10 WAEC purchases per hour
    burst: { limit: 1, ttl: 5000 }, // NEW: Burst limit 1 per 5s
  })
  @Post('education/waec-result/purchase')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Purchase WAEC Result Checker',
    description: 'Buy WAEC result checker PIN',
  })
  @ApiResponse({ status: 201, description: 'Purchase successful' })
  purchaseWAECResult(
    @GetUser('id') userId: string,
    @Body() dto: PurchaseWAECResultDto,
  ) {
    return this.vtuService.purchaseWAECResult(userId, dto);
  }

  // ==================== Order Management ====================

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get VTU Orders',
    description: 'List VTU transaction history with filters',
  })
  @ApiResponse({ status: 200, description: 'Orders retrieved' })
  getOrders(@GetUser('id') userId: string, @Query() filters: GetOrdersDto) {
    return this.vtuService.getOrders(userId, filters);
  }

  @Get('orders/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Order by ID',
    description: 'Get details of a specific VTU order',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order details retrieved' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getOrderById(
    @GetUser('id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.vtuService.getOrderById(orderId, userId);
  }

  @Get('orders/reference/:reference')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Order by Reference',
    description: 'Get details of a VTU order by reference',
  })
  @ApiParam({ name: 'reference', description: 'Transaction reference' })
  @ApiResponse({ status: 200, description: 'Order details retrieved' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getOrderByReference(
    @GetUser('id') userId: string,
    @Param('reference') reference: string,
  ) {
    return this.vtuService.getOrderByReference(reference, userId);
  }

  @Post('orders/:orderId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry Failed Order',
    description: 'Retry a failed VTU transaction',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Retry initiated' })
  retryFailedOrder(
    @GetUser('id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.vtuService.retryFailedOrder(orderId, userId);
  }

  // ==================== Saved Recipients ====================

  @Get('saved-recipients')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Saved Recipients',
    description: 'List saved VTU recipients',
  })
  @ApiResponse({ status: 200, description: 'Recipients retrieved' })
  getSavedRecipients(
    @GetUser('id') userId: string,
    @Query() dto: GetSavedRecipientsDto,
  ) {
    return this.vtuService.getSavedRecipients(userId, dto.serviceType);
  }

  @Post('saved-recipients/:recipientId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update Saved Recipient',
    description: 'Update details of a saved recipient',
  })
  @ApiParam({ name: 'recipientId', description: 'Recipient ID' })
  @ApiResponse({ status: 200, description: 'Recipient updated' })
  updateSavedRecipient(
    @GetUser('id') userId: string,
    @Param('recipientId') recipientId: string,
    @Body() dto: UpdateSavedRecipientDto,
  ) {
    if (!dto.recipientName) {
      throw new BadRequestException('Recipient name is required');
    }
    return this.vtuService.updateSavedRecipient(
      recipientId,
      userId,
      dto.recipientName,
    );
  }

  @Post('saved-recipients/:recipientId/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete Saved Recipient',
    description: 'Remove a saved recipient',
  })
  @ApiParam({ name: 'recipientId', description: 'Recipient ID' })
  @ApiResponse({ status: 200, description: 'Recipient deleted' })
  deleteSavedRecipient(
    @GetUser('id') userId: string,
    @Param('recipientId') recipientId: string,
  ) {
    return this.vtuService.deleteSavedRecipient(recipientId, userId);
  }
}
