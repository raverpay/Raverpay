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
} from '@nestjs/common';
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

  @Post('airtime/purchase')
  @HttpCode(HttpStatus.CREATED)
  purchaseAirtime(
    @GetUser('id') userId: string,
    @Body() dto: PurchaseAirtimeDto,
  ) {
    return this.vtuService.purchaseAirtime(userId, dto);
  }

  @Post('data/purchase')
  @HttpCode(HttpStatus.CREATED)
  purchaseData(@GetUser('id') userId: string, @Body() dto: PurchaseDataDto) {
    return this.vtuService.purchaseDataBundle(userId, dto);
  }

  @Post('cable-tv/pay')
  @HttpCode(HttpStatus.CREATED)
  payCableTVSubscription(
    @GetUser('id') userId: string,
    @Body() dto: PayCableTVDto,
  ) {
    return this.vtuService.payCableTVSubscription(userId, dto);
  }

  @Post('showmax/pay')
  @HttpCode(HttpStatus.CREATED)
  payShowmaxSubscription(
    @GetUser('id') userId: string,
    @Body() dto: PayShowmaxDto,
  ) {
    return this.vtuService.payShowmaxSubscription(userId, dto);
  }

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
}
