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
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
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

@Controller('vtu')
@UseGuards(JwtAuthGuard)
export class VTUController {
  constructor(private readonly vtuService: VTUService) {}

  // ==================== Product Catalog ====================

  @Get('airtime/providers')
  @HttpCode(HttpStatus.OK)
  getAirtimeProviders() {
    return this.vtuService.getAirtimeProviders();
  }

  @Get('data/plans/:network')
  @HttpCode(HttpStatus.OK)
  getDataPlans(@Param('network') network: string) {
    return this.vtuService.getDataPlans(network);
  }

  @Get('data/sme-plans/:network')
  @HttpCode(HttpStatus.OK)
  getSMEDataPlans(@Param('network') network: string) {
    return this.vtuService.getSMEDataPlans(network);
  }

  @Get('cable-tv/plans/:provider')
  @HttpCode(HttpStatus.OK)
  getCableTVPlans(@Param('provider') provider: string) {
    return this.vtuService.getCableTVPlans(provider);
  }

  @Get('electricity/providers')
  @HttpCode(HttpStatus.OK)
  getElectricityProviders() {
    return this.vtuService.getElectricityProviders();
  }

  // ==================== International Airtime/Data Catalog ====================

  @Get('international/countries')
  @HttpCode(HttpStatus.OK)
  getInternationalCountries() {
    return this.vtuService.getInternationalCountries();
  }

  @Get('international/product-types/:countryCode')
  @HttpCode(HttpStatus.OK)
  getInternationalProductTypes(@Param('countryCode') countryCode: string) {
    return this.vtuService.getInternationalProductTypes(countryCode);
  }

  @Get('international/operators/:countryCode/:productTypeId')
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
  @HttpCode(HttpStatus.OK)
  verifySmartcard(@Body() dto: VerifySmartcardDto) {
    return this.vtuService.validateSmartcard(dto.smartcardNumber, dto.provider);
  }

  @Post('electricity/verify')
  @HttpCode(HttpStatus.OK)
  verifyMeterNumber(@Body() dto: VerifyMeterDto) {
    return this.vtuService.validateMeterNumber(
      dto.meterNumber,
      dto.disco,
      dto.meterType,
    );
  }

  // ==================== Purchases ====================

  @Throttle({ default: { limit: 30, ttl: 3600000 } }) // 30 airtime purchases per hour
  @Post('airtime/purchase')
  @HttpCode(HttpStatus.CREATED)
  purchaseAirtime(
    @GetUser('id') userId: string,
    @Body() dto: PurchaseAirtimeDto,
  ) {
    return this.vtuService.purchaseAirtime(userId, dto);
  }

  @Throttle({ default: { limit: 30, ttl: 3600000 } }) // 30 data purchases per hour
  @Post('data/purchase')
  @HttpCode(HttpStatus.CREATED)
  purchaseData(@GetUser('id') userId: string, @Body() dto: PurchaseDataDto) {
    return this.vtuService.purchaseDataBundle(userId, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 cable TV payments per hour
  @Post('cable-tv/pay')
  @HttpCode(HttpStatus.CREATED)
  payCableTVSubscription(
    @GetUser('id') userId: string,
    @Body() dto: PayCableTVDto,
  ) {
    return this.vtuService.payCableTVSubscription(userId, dto);
  }

  @Get('showmax/plans')
  @HttpCode(HttpStatus.OK)
  getShowmaxPlans() {
    return this.vtuService.getShowmaxPlans();
  }

  @Post('showmax/pay')
  @HttpCode(HttpStatus.CREATED)
  payShowmaxSubscription(
    @GetUser('id') userId: string,
    @Body() dto: PayShowmaxDto,
  ) {
    return this.vtuService.payShowmaxSubscription(userId, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 electricity payments per hour
  @Post('electricity/pay')
  @HttpCode(HttpStatus.CREATED)
  payElectricityBill(
    @GetUser('id') userId: string,
    @Body() dto: PayElectricityDto,
  ) {
    return this.vtuService.payElectricityBill(userId, dto);
  }

  @Post('international/purchase')
  @HttpCode(HttpStatus.CREATED)
  purchaseInternationalAirtime(
    @GetUser('id') userId: string,
    @Body() dto: PurchaseInternationalAirtimeDto,
  ) {
    return this.vtuService.purchaseInternationalAirtime(userId, dto);
  }

  // ==================== Education Services ====================

  @Get('education/jamb/variations')
  @HttpCode(HttpStatus.OK)
  getJAMBVariations() {
    return this.vtuService.getJAMBVariations();
  }

  @Get('education/waec-registration/variations')
  @HttpCode(HttpStatus.OK)
  getWAECRegistrationVariations() {
    return this.vtuService.getWAECRegistrationVariations();
  }

  @Get('education/waec-result/variations')
  @HttpCode(HttpStatus.OK)
  getWAECResultVariations() {
    return this.vtuService.getWAECResultVariations();
  }

  @Post('education/jamb/verify-profile')
  @HttpCode(HttpStatus.OK)
  verifyJAMBProfile(@Body() dto: VerifyJAMBProfileDto) {
    return this.vtuService.verifyJAMBProfile(dto.profileId, dto.variationCode);
  }

  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 JAMB purchases per hour
  @Post('education/jamb/purchase')
  @HttpCode(HttpStatus.CREATED)
  purchaseJAMBPin(
    @GetUser('id') userId: string,
    @Body() dto: PurchaseJAMBPinDto,
  ) {
    return this.vtuService.purchaseJAMBPin(userId, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 WAEC purchases per hour
  @Post('education/waec-registration/purchase')
  @HttpCode(HttpStatus.CREATED)
  purchaseWAECRegistration(
    @GetUser('id') userId: string,
    @Body() dto: PurchaseWAECRegistrationDto,
  ) {
    return this.vtuService.purchaseWAECRegistration(userId, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 WAEC purchases per hour
  @Post('education/waec-result/purchase')
  @HttpCode(HttpStatus.CREATED)
  purchaseWAECResult(
    @GetUser('id') userId: string,
    @Body() dto: PurchaseWAECResultDto,
  ) {
    return this.vtuService.purchaseWAECResult(userId, dto);
  }

  // ==================== Order Management ====================

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  getOrders(@GetUser('id') userId: string, @Query() filters: GetOrdersDto) {
    return this.vtuService.getOrders(userId, filters);
  }

  @Get('orders/:orderId')
  @HttpCode(HttpStatus.OK)
  getOrderById(
    @GetUser('id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.vtuService.getOrderById(orderId, userId);
  }

  @Get('orders/reference/:reference')
  @HttpCode(HttpStatus.OK)
  getOrderByReference(
    @GetUser('id') userId: string,
    @Param('reference') reference: string,
  ) {
    return this.vtuService.getOrderByReference(reference, userId);
  }

  @Post('orders/:orderId/retry')
  @HttpCode(HttpStatus.OK)
  retryFailedOrder(
    @GetUser('id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.vtuService.retryFailedOrder(orderId, userId);
  }

  // ==================== Saved Recipients ====================

  @Get('saved-recipients')
  @HttpCode(HttpStatus.OK)
  getSavedRecipients(
    @GetUser('id') userId: string,
    @Query() dto: GetSavedRecipientsDto,
  ) {
    return this.vtuService.getSavedRecipients(userId, dto.serviceType);
  }

  @Post('saved-recipients/:recipientId')
  @HttpCode(HttpStatus.OK)
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
  deleteSavedRecipient(
    @GetUser('id') userId: string,
    @Param('recipientId') recipientId: string,
  ) {
    return this.vtuService.deleteSavedRecipient(recipientId, userId);
  }
}
