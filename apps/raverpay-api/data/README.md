# GeoLite2 Database Setup

This directory should contain the MaxMind GeoLite2 City database file for IP geolocation.

## Download Instructions

1. **Sign up for MaxMind account** (free):
   - Go to https://www.maxmind.com/en/geolite2/signup
   - Create a free account

2. **Download GeoLite2-City database**:
   - After logging in, go to "Download Files"
   - Download "GeoLite2-City" in MMDB format
   - Extract the `.mmdb` file

3. **Place the file**:
   - Rename the file to `GeoLite2-City.mmdb`
   - Place it in this `data/` directory
   - The path should be: `apps/mularpay-api/data/GeoLite2-City.mmdb`

## Alternative: Automatic Updates

You can set up automatic updates using MaxMind's GeoIP Update tool:

- Documentation: https://dev.maxmind.com/geoip/geoipupdate/

## Note

The database is updated regularly by MaxMind. For production, consider:

- Setting up automated weekly/monthly updates
- Using MaxMind's GeoIP Update tool
- Or downloading manually when needed

## Fallback

If the database file is not found, IP geolocation will be disabled and the service will log a warning. The application will continue to work normally, but location information will not be available.
