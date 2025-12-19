// CoinGecko Price Update Cron - COMMENTED OUT (not using CoinGecko price fetching)
// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { PriceService } from '../services/price.service';

// /**
//  * Price Update Cron Job
//  * Updates crypto prices from CoinGecko every minute
//  */
// @Injectable()
// export class PriceUpdateCron {
//   private readonly logger = new Logger(PriceUpdateCron.name);
//   private isRunning = false;

//   constructor(private readonly priceService: PriceService) {}

//   /**
//    * Update crypto prices every minute
//    */
//   @Cron(CronExpression.EVERY_MINUTE)
//   async updatePrices() {
//     if (this.isRunning) {
//       return;
//     }

//     this.isRunning = true;

//     try {
//       await this.priceService.updateAllPrices();
//     } catch (error) {
//       this.logger.error('Price update cron failed', error);
//     } finally {
//       this.isRunning = false;
//     }
//   }

//   /**
//    * Cleanup old prices every day at midnight
//    */
//   @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
//   async cleanupOldPrices() {
//     try {
//       await this.priceService.cleanupOldPrices();
//     } catch (error) {
//       this.logger.error('Price cleanup cron failed', error);
//     }
//   }
// }
