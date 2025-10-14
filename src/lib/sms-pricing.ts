import prisma from '@/lib/prisma';

// Tarifs SMS complets - 199 pays extraits du fichier HTML (2025-10-14)
export const SMS_PRICING_DATA = {
  'Albania': 0.0776,
  'Algeria': 0.2112,
  'American Samoa': 0.0089,
  'Andorra': 0.0561,
  'Angola': 0.05,
  'Anguilla': 0.033,
  'Antigua and Barbuda': 0.0589,
  'Argentina': 0.0984,
  'Armenia': 0.078,
  'Aruba': 0.0512,
  'Australia': 0.0822,
  'Austria': 0.0841,
  'Azerbaijan': 0.1287,
  'Bahamas': 0.0308,
  'Bahrain': 0.0432,
  'Bangladesh': 0.2487,
  'Barbados': 0.0398,
  'Belarus': 0.1841,
  'Belgium': 0.1045,
  'Belize': 0.0186,
  'Benin': 0.0528,
  'Bermuda': 0.0408,
  'Bhutan': 0.0792,
  'Bolivia': 0.117,
  'Bosnia and Herzegovina': 0.0871,
  'Botswana': 0.0658,
  'Brazil': 0.0813,
  'Brunei': 0.0186,
  'Bulgaria': 0.1224,
  'Burkina Faso': 0.0444,
  'Cambodia': 0.1553,
  'Cameroon': 0.0776,
  'Canada': 0.011,
  'Cayman Islands': 0.0327,
  'Chad': 0.0619,
  'Chile': 0.0751,
  'China': 0.0484,
  'Colombia': 0.0143,
  'Comoros': 0.1155,
  'Congo (Dem. Rep.)': 0.1115,
  'Cook Islands': 0.0215,
  'Costa Rica': 0.0293,
  'Croatia': 0.0627,
  'Cyprus': 0.0551,
  'Czech Republic': 0.0684,
  'Denmark': 0.0528,
  'Djibouti': 0.0908,
  'Dominica': 0.0247,
  'Dominican Republic': 0.0398,
  'East Timor': 0.0743,
  'Ecuador': 0.1503,
  'Egypt': 0.1144,
  'El Salvador': 0.0396,
  'Equatorial Guinea': 0.066,
  'Estonia': 0.0941,
  'Eswatini': 0.0957,
  'Ethiopia': 0.0215,
  'Faroe Islands': 0.0215,
  'Fiji': 0.0849,
  'Finland': 0.0766,
  'France': 0.0495,
  'French Guiana': 0.13,
  'French Polynesia': 0.0949,
  'French Southern Territories': 0.1335,
  'Gabon': 0.0615,
  'Gambia': 0.0375,
  'Georgia': 0.1276,
  'Germany': 0.099,
  'Ghana': 0.1161,
  'Gibraltar': 0.0215,
  'Greece': 0.0897,
  'Greenland': 0.0215,
  'Grenada': 0.0319,
  'Guadeloupe': 0.165,
  'Guam': 0.0639,
  'Guatemala': 0.0419,
  'Guinea-Bissau': 0.0974,
  'Guyana': 0.0495,
  'Haiti': 0.1524,
  'Honduras': 0.0361,
  'Hong Kong': 0.0852,
  'Hungary': 0.1023,
  'Iceland': 0.0589,
  'India': 0.0379,
  'Indonesia': 0.2539,
  'Ireland': 0.0583,
  'Israel': 0.0996,
  'Italy': 0.0477,
  'Ivory Coast': 0.0014,
  'Jamaica': 0.077,
  'Japan': 0.0572,
  'Jordan': 0.1579,
  'Kenya': 0.0559,
  'Kosovo': 0.0512,
  'Kuwait': 0.0483,
  'Kyrgyzstan': 0.0023,
  'Laos': 0.0528,
  'Latvia': 0.066,
  'Lebanon': 0.1353,
  'Lesotho': 0.0726,
  'Liberia': 0.049,
  'Liechtenstein': 0.019,
  'Lithuania': 0.0418,
  'Luxembourg': 0.0605,
  'Macau': 0.03,
  'Macedonia': 0.0705,
  'Madagascar': 0.1662,
  'Malawi': 0.0693,
  'Malaysia': 0.0451,
  'Maldives': 0.0215,
  'Mali': 0.1106,
  'Malta': 0.0693,
  'Martinique': 0.1056,
  'Mauritania': 0.1094,
  'Mauritius': 0.1142,
  'Mayotte/La Réunion': 0.1335,
  'Mexico': 0.033,
  'Moldova': 0.0879,
  'Monaco': 0.1001,
  'Mongolia': 0.0792,
  'Montenegro': 0.0549,
  'Montserrat': 0.0264,
  'Morocco': 0.1558,
  'Mozambique': 0.0292,
  'Myanmar': 0.0883,
  'Namibia': 0.1238,
  'Nauru': 0.0346,
  'Nepal': 0.1078,
  'Netherlands': 0.1045,
  'New Caledonia': 0.1485,
  'New Zealand': 0.1108,
  'Nicaragua': 0.0936,
  'Niger': 0.0865,
  'Nigeria': 0.1484,
  'Norway': 0.08,
  'Oman': 0.0866,
  'Pakistan': 0.1978,
  'Palau': 0.0212,
  'Palestinian Territory': 0.3491,
  'Panama': 0.0813,
  'Papua New Guinea': 0.0292,
  'Paraguay': 0.0355,
  'Peru': 0.0303,
  'Philippines': 0.1275,
  'Poland': 0.0186,
  'Portugal': 0.0678,
  'Puerto Rico': 0.0606,
  'Qatar': 0.0515,
  'Reunion': 0.1335,
  'Romania': 0.0607,
  'Russia': 0.0021,
  'Rwanda': 0.0578,
  'Saint Barthelemy': 0.165,
  'Saint Kitts and Nevis': 0.0343,
  'Saint Lucia': 0.0239,
  'Saint Pierre and Miquelon': 0.165,
  'Saint Vincent and The Grenadines': 0.0429,
  'Samoa': 0.0329,
  'San Marino': 0.0572,
  'Saudi Arabia': 0.0362,
  'Senegal': 0.0853,
  'Serbia': 0.0959,
  'Seychelles': 0.0453,
  'Sierra Leone': 0.0363,
  'Singapore': 0.0354,
  'Slovakia': 0.0771,
  'Slovenia': 0.1532,
  'South Africa': 0.0247,
  'South Korea': 0.0177,
  'South Sudan': 0.0512,
  'Spain': 0.0477,
  'Sri Lanka': 0.2008,
  'Suriname': 0.0355,
  'Sweden': 0.0453,
  'Switzerland': 0.0539,
  'Taiwan': 0.0822,
  'Tajikistan': 0.1059,
  'Tanzania': 0.0482,
  'Thailand': 0.0194,
  'Togo': 0.0528,
  'Tonga': 0.0379,
  'Trinidad and Tobago': 0.0596,
  'Tunisia': 0.1558,
  'Turkey': 0.0149,
  'Turkmenistan': 0.0875,
  'Turks and Caicos Islands': 0.0512,
  'Uganda': 0.0746,
  'Ukraine': 0.1604,
  'United Arab Emirates': 0.1139,
  'United Kingdom': 0.0348,
  'United States': 0.011,
  'Uruguay': 0.0431,
  'Uzbekistan': 0.1254,
  'Vanuatu': 0.0808,
  'Vietnam': 0.0771,
  'Virgin Islands, British': 0.0363,
  'Virgin Islands, US': 0.0434,
  'Wallis and Futuna': 0.165,
  'Zambia': 0.0516,
} as const;

export type SmsCountry = keyof typeof SMS_PRICING_DATA;

const DEFAULT_SMS_PRICE = 0.065; // Tarif par défaut si pays non trouvé

/**
 * Service de gestion des tarifs SMS avec versioning
 * Version simplifiée utilisant les tarifs réels en dur
 * TODO: Migrer vers le système de versioning Prisma une fois les tables disponibles
 */
export class SmsPricingService {
  /**
   * Obtenir le tarif unitaire pour un pays
   */
  static getUnitPrice(country: string): number {
    return SMS_PRICING_DATA[country as SmsCountry] || DEFAULT_SMS_PRICE;
  }

  /**
   * Calculer le coût SMS avec les tarifs réels
   */
  static calculateSMSCost(
    country: string, 
    smsCount: number
  ): { cost: number; unitPrice: number; source: string } {
    const unitPrice = this.getUnitPrice(country);
    const cost = unitPrice * smsCount;
    const source = SMS_PRICING_DATA[country as SmsCountry] ? 'real_tariff' : 'fallback';
    
    console.log(`📊 SMS Cost: ${country} x${smsCount} = ${cost.toFixed(4)}€ (${unitPrice}€/SMS, source: ${source})`);
    
    return { cost, unitPrice, source };
  }

  /**
   * Obtenir tous les tarifs disponibles
   */
  static getAllPricing(): Record<string, number> {
    return { ...SMS_PRICING_DATA };
  }

  /**
   * Obtenir les statistiques des tarifs
   */
  static getPricingStats(): {
    totalCountries: number;
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    priceRanges: { [range: string]: number };
  } {
    const prices = Object.values(SMS_PRICING_DATA);
    const totalCountries = prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / totalCountries;

    // Répartition par tranches de prix
    const priceRanges = {
      '0-0.05€': 0,
      '0.05-0.10€': 0,
      '0.10-0.15€': 0,
      '0.15€+': 0,
    };

    prices.forEach(price => {
      if (price < 0.05) priceRanges['0-0.05€']++;
      else if (price < 0.10) priceRanges['0.05-0.10€']++;
      else if (price < 0.15) priceRanges['0.10-0.15€']++;
      else priceRanges['0.15€+']++;
    });

    return { totalCountries, minPrice, maxPrice, avgPrice, priceRanges };
  }

  /**
   * Rechercher des pays par tarif
   */
  static findCountriesByPriceRange(minPrice: number, maxPrice: number): Array<{ country: string; price: number }> {
    return Object.entries(SMS_PRICING_DATA)
      .filter(([, price]) => price >= minPrice && price <= maxPrice)
      .map(([country, price]) => ({ country, price }))
      .sort((a, b) => a.price - b.price);
  }

  /**
   * Future: Créer une nouvelle version de tarification SMS (avec Prisma)
   */
  static async createPricingVersionAsync(
    version: string,
    effectiveFrom: Date = new Date(),
    pricingData: Record<string, number> = SMS_PRICING_DATA
  ): Promise<{ success: boolean; message: string }> {
    try {
      // TODO: Implémenter après résolution des problèmes Prisma
      console.log(`📋 Version de tarification "${version}" avec ${Object.keys(pricingData).length} pays prête`);
      console.log(`📅 Date d'effet: ${effectiveFrom.toISOString()}`);
      
      return {
        success: true,
        message: `Version ${version} avec ${Object.keys(pricingData).length} pays prête pour implémentation`
      };
    } catch (error) {
      console.error('❌ Erreur lors de la création de la version de tarification:', error);
      return {
        success: false,
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }
}

/**
 * Fonction utilitaire simple pour obtenir le tarif d'un pays
 * Compatible avec le code existant
 */
export function getSMSPriceForCountry(country: string): number {
  return SmsPricingService.getUnitPrice(country);
}

/**
 * Fonction async pour compatibilité avec l'ancien code
 */
export async function getSmsPrice(country: string): Promise<number> {
  return SmsPricingService.getUnitPrice(country);
}

/**
 * Obtenir tous les tarifs avec métadonnées
 */
export function getAllSmsPricing(): {
  pricing: Record<string, number>;
  stats: ReturnType<typeof SmsPricingService.getPricingStats>;
  version: string;
} {
  return {
    pricing: SmsPricingService.getAllPricing(),
    stats: SmsPricingService.getPricingStats(),
    version: 'v1.0-real-tariffs'
  };
}