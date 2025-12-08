import { Injectable, Logger } from '@nestjs/common';
import { Reader, CityResponse } from 'maxmind';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class IpGeolocationService {
  private readonly logger = new Logger(IpGeolocationService.name);
  private lookup: Reader<CityResponse> | null = null;
  private dbPath: string;

  constructor() {
    // Try to find GeoLite2 database file
    const possiblePaths = [
      path.join(process.cwd(), 'data', 'GeoLite2-City.mmdb'),
      path.join(process.cwd(), 'prisma', 'data', 'GeoLite2-City.mmdb'),
      path.join(__dirname, '../../..', 'data', 'GeoLite2-City.mmdb'),
      path.join(__dirname, '../../../data', 'GeoLite2-City.mmdb'),
    ];

    this.dbPath = possiblePaths.find((p) => fs.existsSync(p)) || '';

    if (this.dbPath) {
      try {
        const buffer = fs.readFileSync(this.dbPath);
        this.lookup = new Reader<CityResponse>(buffer);
        this.logger.log(`GeoLite2 database loaded from: ${this.dbPath}`);
      } catch (error) {
        this.logger.warn(
          `Failed to load GeoLite2 database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        this.lookup = null;
      }
    } else {
      this.logger.warn(
        'GeoLite2 database not found. IP geolocation will be disabled. Please download GeoLite2-City.mmdb and place it in the data/ directory.',
      );
    }
  }

  /**
   * Get city/location from IP address
   * @param ipAddress - IP address to lookup
   * @returns City name (e.g., "Lagos", "Ibadan", "New York") or null if not found
   */
  getCityFromIp(ipAddress: string): string | null {
    if (!this.lookup || !ipAddress || ipAddress === 'unknown') {
      return null;
    }

    try {
      // Skip private/local IPs
      if (
        ipAddress.startsWith('127.') ||
        ipAddress.startsWith('192.168.') ||
        ipAddress.startsWith('10.') ||
        ipAddress.startsWith('172.16.') ||
        ipAddress === 'localhost'
      ) {
        return null;
      }

      const result = this.lookup.get(ipAddress);

      if (!result) {
        return null;
      }

      // Try to get city name, fallback to other location data
      const city =
        (result.city?.names?.en as string) ||
        (result.city?.names?.['en-US'] as string);
      const subdivision =
        (result.subdivisions?.[0]?.names?.en as string) ||
        (result.subdivisions?.[0]?.names?.['en-US'] as string);
      const country =
        (result.country?.names?.en as string) ||
        (result.country?.names?.['en-US'] as string);

      // Format: "City, Country" or "City" or "Subdivision, Country" or "Country"
      if (city && country) {
        return `${city}, ${country}`;
      } else if (city) {
        return city;
      } else if (subdivision && country) {
        return `${subdivision}, ${country}`;
      } else if (subdivision) {
        return subdivision;
      } else if (country) {
        return country;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error looking up IP ${ipAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Check if geolocation service is available
   */
  isAvailable(): boolean {
    return this.lookup !== null;
  }
}
