<?php
/**
 * SMS rate management by country
 *
 * @since      1.0.0
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class RoadPress_SMS_Pricing {
    
    /**
     * SMS rates by country
     *
     * @return array SMS rates by country
     */
    public static function get_sms_prices() {
        return array(
            'Albania' => 0.0776,
            'Algeria' => 0.2112,
            'American Samoa' => 0.0089,
            'Andorra' => 0.0561,
            'Angola' => 0.0500,
            'Anguilla' => 0.0330,
            'Antigua and Barbuda' => 0.0589,
            'Argentina' => 0.0984,
            'Armenia' => 0.0780,
            'Aruba' => 0.0512,
            'Australia' => 0.0822,
            'Austria' => 0.0841,
            'Azerbaijan' => 0.1287,
            'Bahamas' => 0.0308,
            'Bahrain' => 0.0432,
            'Bangladesh' => 0.2487,
            'Barbados' => 0.0398,
            'Belarus' => 0.1841,
            'Belgium' => 0.1045,
            'Belize' => 0.0186,
            'Benin' => 0.0528,
            'Bermuda' => 0.0408,
            'Bhutan' => 0.0792,
            'Bolivia' => 0.1170,
            'Bosnia and Herzegovina' => 0.0871,
            'Botswana' => 0.0658,
            'Brazil' => 0.0813,
            'Brunei' => 0.0186,
            'Bulgaria' => 0.1224,
            'Burkina Faso' => 0.0444,
            'Cambodia' => 0.1553,
            'Cameroon' => 0.0776,
            'Canada' => 0.0110,
            'Cayman Islands' => 0.0327,
            'Chad' => 0.0619,
            'Chile' => 0.0751,
            'China' => 0.0484,
            'Colombia' => 0.0143,
            'Comoros' => 0.1155,
            'Congo (Dem. Rep.)' => 0.1115,
            'Cook Islands' => 0.0215,
            'Costa Rica' => 0.0293,
            'Croatia' => 0.0627,
            'Cyprus' => 0.0551,
            'Czech Republic' => 0.0684,
            'Denmark' => 0.0528,
            'Djibouti' => 0.0908,
            'Dominica' => 0.0247,
            'Dominican Republic' => 0.0398,
            'East Timor' => 0.0743,
            'Ecuador' => 0.1503,
            'Egypt' => 0.1144,
            'El Salvador' => 0.0396,
            'Equatorial Guinea' => 0.0660,
            'Estonia' => 0.0941,
            'Eswatini' => 0.0957,
            'Ethiopia' => 0.0215,
            'Faroe Islands' => 0.0215,
            'Fiji' => 0.0849,
            'Finland' => 0.0766,
            'France' => 0.0495,
            'French Guiana' => 0.1300,
            'French Polynesia' => 0.0949,
            'French Southern Territories' => 0.1335,
            'Gabon' => 0.0615,
            'Gambia' => 0.0375,
            'Georgia' => 0.1276,
            'Germany' => 0.0990,
            'Ghana' => 0.1161,
            'Gibraltar' => 0.0215,
            'Greece' => 0.0897,
            'Greenland' => 0.0215,
            'Grenada' => 0.0319,
            'Guadeloupe' => 0.1650,
            'Guam' => 0.0639,
            'Guatemala' => 0.0419,
            'Guinea-Bissau' => 0.0974,
            'Guyana' => 0.0495,
            'Haiti' => 0.1524,
            'Honduras' => 0.0361,
            'Hong Kong' => 0.0852,
            'Hungary' => 0.1023,
            'Iceland' => 0.0589,
            'India' => 0.0379,
            'Indonesia' => 0.2539,
            'Ireland' => 0.0583,
            'Israel' => 0.0996,
            'Italy' => 0.0477,
            'Ivory Coast' => 0.0014,
            'Jamaica' => 0.0770,
            'Japan' => 0.0572,
            'Jordan' => 0.1579,
            'Kenya' => 0.0559,
            'Kosovo' => 0.0512,
            'Kuwait' => 0.0483,
            'Kyrgyzstan' => 0.0023,
            'Laos' => 0.0528,
            'Latvia' => 0.0660,
            'Lebanon' => 0.1353,
            'Lesotho' => 0.0726,
            'Liberia' => 0.0490,
            'Liechtenstein' => 0.0190,
            'Lithuania' => 0.0418,
            'Luxembourg' => 0.0605,
            'Macau' => 0.0300,
            'Macedonia' => 0.0705,
            'Madagascar' => 0.1662,
            'Malawi' => 0.0693,
            'Malaysia' => 0.0451,
            'Maldives' => 0.0215,
            'Mali' => 0.1106,
            'Malta' => 0.0693,
            'Martinique' => 0.1056,
            'Mauritania' => 0.1094,
            'Mauritius' => 0.1142,
            'Mayotte/La Réunion' => 0.1335,
            'Mexico' => 0.0330,
            'Moldova' => 0.0879,
            'Monaco' => 0.1001,
            'Mongolia' => 0.0792,
            'Montenegro' => 0.0549,
            'Montserrat' => 0.0264,
            'Morocco' => 0.1558,
            'Mozambique' => 0.0292,
            'Myanmar' => 0.0883,
            'Namibia' => 0.1238,
            'Nauru' => 0.0346,
            'Nepal' => 0.1078,
            'Netherlands' => 0.1045,
            'New Caledonia' => 0.1485,
            'New Zealand' => 0.1108,
            'Nicaragua' => 0.0936,
            'Niger' => 0.0865,
            'Nigeria' => 0.1484,
            'Norway' => 0.0800,
            'Oman' => 0.0866,
            'Pakistan' => 0.1978,
            'Palau' => 0.0212,
            'Palestinian Territory' => 0.3491,
            'Panama' => 0.0813,
            'Papua New Guinea' => 0.0292,
            'Paraguay' => 0.0355,
            'Peru' => 0.0303,
            'Philippines' => 0.1275,
            'Poland' => 0.0186,
            'Portugal' => 0.0678,
            'Puerto Rico' => 0.0606,
            'Qatar' => 0.0515,
            'Reunion' => 0.1335,
            'Romania' => 0.0607,
            'Russia' => 0.0021,
            'Rwanda' => 0.0578,
            'Saint Barthelemy' => 0.1650,
            'Saint Kitts and Nevis' => 0.0343,
            'Saint Lucia' => 0.0239,
            'Saint Pierre and Miquelon' => 0.1650,
            'Saint Vincent and The Grenadines' => 0.0429,
            'Samoa' => 0.0329,
            'San Marino' => 0.0572,
            'Saudi Arabia' => 0.0362,
            'Senegal' => 0.0853,
            'Serbia' => 0.0959,
            'Seychelles' => 0.0453,
            'Sierra Leone' => 0.0363,
            'Singapore' => 0.0354,
            'Slovakia' => 0.0771,
            'Slovenia' => 0.1532,
            'South Africa' => 0.0247,
            'South Korea' => 0.0177,
            'South Sudan' => 0.0512,
            'Spain' => 0.0477,
            'Sri Lanka' => 0.2008,
            'Suriname' => 0.0355,
            'Sweden' => 0.0453,
            'Switzerland' => 0.0539,
            'Taiwan' => 0.0822,
            'Tajikistan' => 0.1059,
            'Tanzania' => 0.0482,
            'Thailand' => 0.0194,
            'Togo' => 0.0528,
            'Tonga' => 0.0379,
            'Trinidad and Tobago' => 0.0596,
            'Tunisia' => 0.1558,
            'Turkey' => 0.0149,
            'Turkmenistan' => 0.0875,
            'Turks and Caicos Islands' => 0.0512,
            'Uganda' => 0.0746,
            'Ukraine' => 0.1604,
            'United Arab Emirates' => 0.1139,
            'United Kingdom' => 0.0348,
            'United States' => 0.0110,
            'Uruguay' => 0.0431,
            'Uzbekistan' => 0.1254,
            'Vanuatu' => 0.0808,
            'Vietnam' => 0.0771,
            'Virgin Islands, British' => 0.0363,
            'Virgin Islands, US' => 0.0434,
            'Wallis and Futuna' => 0.1650,
            'Zambia' => 0.0516,
        );
    }

    /**
     * Obtain the unit price of an SMS for a given country
     * 
     * @param string $country Country
     * @return float SMS unit price
     */
    public static function get_sms_price($country) {
        $prices = self::get_sms_prices();
        
        // If the country is not found, a default average rate is used.
        if (!isset($prices[$country])) {
            return 0.07; // Average default price
        }
        
        return $prices[$country];
    }

    /**
     * Calculate the total cost of SMS for a given country and quantity
     * 
     * @param string $country Country
     * @param int $quantity Number of SMS
     * @return float Total cost
     */
    public static function calculate_sms_cost($country, $quantity) {
        return self::get_sms_price($country) * $quantity;
    }
}
