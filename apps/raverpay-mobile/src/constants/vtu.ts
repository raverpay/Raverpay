// src/constants/vtu.ts
// VTU (Virtual Top-Up) Constants
// These are static providers that don't change, no need to fetch from API

export interface NetworkProvider {
  code: string;
  name: string;
  logo: any; // Image source from require()
  airtimeImage: any;
  dataImage: any;
}

/**
 * Network providers for Airtime and Data services
 * These are the same for both services, the backend appends '-data' for data services
 *
 * Examples:
 * - Airtime: serviceID = 'mtn', 'glo', 'airtel', 'etisalat'
 * - Data: serviceID = 'mtn-data', 'glo-data', 'airtel-data', 'etisalat-data'
 */
export const NETWORK_PROVIDERS: NetworkProvider[] = [
  {
    code: 'mtn',
    name: 'MTN',
    logo: require('../../assets/images/vtpass/airtime/MTN-Airtime-VTU.jpg'),
    airtimeImage: require('../../assets/images/vtpass/airtime/MTN-Airtime-VTU.jpg'),
    dataImage: require('../../assets/images/vtpass/data/MTN-Data.jpg'),
  },
  {
    code: 'glo',
    name: 'GLO',
    logo: require('../../assets/images/vtpass/airtime/GLO-Airtime.jpg'),
    airtimeImage: require('../../assets/images/vtpass/airtime/GLO-Airtime.jpg'),
    dataImage: require('../../assets/images/vtpass/data/GLO-Data.jpg'),
  },
  {
    code: 'airtel',
    name: 'AIRTEL',
    logo: require('../../assets/images/vtpass/airtime/Airtel-Airtime-VTU.jpg'),
    airtimeImage: require('../../assets/images/vtpass/airtime/Airtel-Airtime-VTU.jpg'),
    dataImage: require('../../assets/images/vtpass/data/Airtel-Data.jpg'),
  },
  {
    code: '9mobile',
    name: '9MOBILE',
    logo: require('../../assets/images/vtpass/airtime/9mobile-Airtime-VTU.jpg'),
    airtimeImage: require('../../assets/images/vtpass/airtime/9mobile-Airtime-VTU.jpg'),
    dataImage: require('../../assets/images/vtpass/data/9mobile-Data.jpg'),
  },
];

// Cable TV Providers with images
export const CABLE_PROVIDERS = [
  {
    id: 'DSTV',
    name: 'DStv',
    image: require('../../assets/images/vtpass/cable/Pay-DSTV-Subscription.jpg'),
  },
  {
    id: 'GOTV',
    name: 'GOtv',
    image: require('../../assets/images/vtpass/cable/Gotv-Payment.jpg'),
  },
  {
    id: 'STARTIMES',
    name: 'StarTimes',
    image: require('../../assets/images/vtpass/cable/Startimes-Subscription.jpg'),
  },
];

// Electricity Provider Image Mapping
export const ELECTRICITY_PROVIDER_IMAGES: Record<string, any> = {
  'ikeja-electric': require('../../assets/images/vtpass/electricity/Ikeja-Electric-Payment-PHCN.jpg'),
  'eko-electric': require('../../assets/images/vtpass/electricity/Eko-Electric-Payment-PHCN.jpg'),
  'abuja-electric': require('../../assets/images/vtpass/electricity/Abuja-Electric.jpg'),
  'kano-electric': require('../../assets/images/vtpass/electricity/Kano-Electric.jpg'),
  'portharcourt-electric': require('../../assets/images/vtpass/electricity/PHED-Port-Harcourt-Electric.jpg'),
  'jos-electric': require('../../assets/images/vtpass/electricity/Jos-Electric-JED.jpg'),
  'ibadan-electric': require('../../assets/images/vtpass/electricity/IBEDC-Ibadan-Electricity-Distribution-Company.jpg'),
  'enugu-electric': require('../../assets/images/vtpass/electricity/Enugu-Electric-EEDC.jpg'),
  'benin-electric': require('../../assets/images/vtpass/electricity/Benin-Electricity-BEDC.jpg'),
};

// Default fallback image
export const DEFAULT_PROVIDER_IMAGE = require('../../assets/images/vtpass/airtime/Foreign-Airtime.jpg');
