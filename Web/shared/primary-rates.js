const PRIMARY_RATE_VERSION = '2026-05-30-primary-rate-card';

const PRIMARY_RATE_ROWS = [
    ['Men', 'Shirt', '50-100', '20', '10'],
    ['Men', 'T-Shirt', '50-100', '20', '10'],
    ['Men', 'Trouser', '50-100', '20', '10'],
    ['Men', 'Jeans/Trouser Heavy', '50-100', '20', '15'],
    ['Men', 'Kurta', '50-100', '20', '10'],
    ['Men', 'Coat/Blazer', '80-250', '', '70'],
    ['Men', 'Dhoti', '100-200', '50', '25'],
    ['Men', 'Pajama', '50-100', '20', '10'],
    ['Men', 'Sherwani', '200-250', '', '120'],
    ['Men', 'Shorts', '40', '', '10'],
    ['Men', 'Sweater', '100-200', '60-100', '25'],
    ['Men', 'Leather Jacket Polish', '200-300', '', ''],
    ['Men', 'Rexine Jacket Polish', '200-300', '', ''],
    ['Men', 'Jacket', '180-300', '', ''],
    ['Men', 'Undergarment', '30-50', '20', '10'],
    ['Women', 'Salwar/Leggings', '50-100', '20', '10'],
    ['Women', 'Kurta Plain', '50-100', '20-60', '10'],
    ['Women', 'Suit Heavy', '150-500', '', '100-200'],
    ['Women', 'Saree', '180-500', '', '70-100'],
    ['Women', 'Lehanga Heavy', '250-1000', '', '120-250'],
    ['Women', 'Dupatta Fancy', '50-100', '30', '20'],
    ['Women', 'Blouse Fancy', '50-100', '', '15'],
    ['Women', 'Skirt', '80-150', '', '30'],
    ['Women', 'Jacket Denim', '100-200', '', '30'],
    ['Women', 'Shawl', '90-200', '', '30'],
    ['House Item', 'Bed Sheet Single', '60', '25', '15'],
    ['House Item', 'Bed Sheet Double', '80', '30', '15'],
    ['House Item', 'Blanket Single', '250-300', '', ''],
    ['House Item', 'Blanket Double', '300-500', '', ''],
    ['House Item', 'Quilt Cover Single', '80', '60', '20'],
    ['House Item', 'Quilt Cover Double', '120', '80', '20'],
    ['House Item', 'Pillow', '100', '', '10'],
    ['House Item', 'Cushion', '50', '30', '10'],
    ['House Item', 'Cushion Cover', '30', '20', ''],
    ['House Item', 'Hand Towel', '20', '12', ''],
    ['House Item', 'Towel Big', '40', '20', ''],
    ['House Item', 'Curtains', '80-160', '40-80', '30-60'],
    ['House Item', 'Bathrobe', '60-100', '40-80', ''],
    ['House Item', 'Mat', '40-60', '30', ''],
    ['House Item', 'Table Mat', '40-80', '30-50', ''],
    ['House Item', 'Table Cover', '40', '30-50', '15-25'],
    ['House Item', 'Carpet', '400-2000', '', ''],
    ['Shoes', 'Shoe', '250-500', '', ''],
];

const HOTEL_RATES = [
    ['Bed Sheet (Single)', '8'], ['Bed Sheet (Double / King)', '15'], ['Pillow Cover', '7'],
    ['Duvet Cover', '25'], ['Bed Cover', '25'], ['Runner', '8'], ['Frill', '15'],
    ['Bath Towel', '10'], ['Hand Towel', '10'], ['Face Towel', '8'], ['Bath Mat', '10'],
    ['Table Cloth', '10'], ['Cloth Napkin', '8'], ['Table Runner', '8'], ['Chair Cover', '15'],
    ['Chef Coat', '25'], ['Staff Uniform', '25'], ['Apron', '15'],
    ['Blanket (Single)', '150'], ['Blanket (Double)', '300'],
    ['Guest Laundry - Shirt', '20'], ['Guest Laundry - Pant', '20'], ['Guest Laundry - T-Shirt', '15'],
    ['Guest Laundry - Jeans', '20'], ['Guest Laundry - Shorts', '15'],
    ['Guest Laundry - Track Pant', '15'], ['Guest Laundry - Vest / Underwear', '15'],
    ['Guest Laundry - Handkerchief', '10'],
];

const WASH_ONLY_RATES = [
    ['Men', 'T Shirt', '30'], ['Men', 'Shirt', '40'], ['Men', 'Pants', '40'], ['Men', 'Jeans', '50'],
    ['Women', 'Top Plain', '30'], ['Women', 'Legging', '30'], ['Women', 'Kurta Plain', '40'], ['Women', 'Jeans', '50'],
];

const SHOE_CLEANING_RATES = [
    ['Canvas Shoes', '310'], ['Slippers', '310'], ['Sport Shoes', '310'], ['Sandals', '380'],
    ['Leather Shoes', '760'], ['Suede Leather Shoes', '760'], ['Ankle Length Boots', '990'],
    ['Mid Length Boots', '1270'], ['Knee Length Boots', '1600'],
];

function normalizeCategory(category) {
    const value = String(category || '').trim();
    if (/^mens$/i.test(value)) return 'Men';
    if (/^womens$/i.test(value)) return 'Women';
    if (/^house\s*hold$/i.test(value)) return 'House Item';
    if (/^household$/i.test(value)) return 'House Item';
    return value;
}

function formatTitleCase(str) {
    if (!str) return '';
    const text = String(str).trim();
    if (text === text.toUpperCase() && text.length > 1) {
        return text.toLowerCase().replace(/(?:^|\s|\/|-)\w/g, match => match.toUpperCase());
    }
    return text;
}

function normalizeItemKey(item) {
    return String(item || '')
        .trim()
        .toLowerCase()
        .replace(/\bleggines\b/g, 'leggings');
}

function lowestNumber(displayPrice) {
    const match = String(displayPrice || '').match(/\d+/);
    return match ? Number(match[0]) : 0;
}

function exactPriceItem(item, category, serviceType, displayPrice) {
    const priceText = String(displayPrice || '').trim();
    return {
        item: formatTitleCase(item),
        category: normalizeCategory(category),
        serviceType,
        price: lowestNumber(priceText),
        displayPrice: priceText,
        source: 'primary-rate-card',
        locked: true,
        updatedAt: PRIMARY_RATE_VERSION,
    };
}

function normalizeRate(rate) {
    const displayPrice = rate.displayPrice ?? rate.price;
    return {
        ...rate,
        item: formatTitleCase(rate.item),
        category: normalizeCategory(rate.category),
        serviceType: rate.serviceType,
        price: Number(rate.price ?? lowestNumber(displayPrice) ?? 0),
        displayPrice: displayPrice === undefined || displayPrice === null ? undefined : String(displayPrice),
    };
}

function rateKey(rate) {
    return [
        String(rate.serviceType || '').trim().toLowerCase(),
        normalizeCategory(rate.category).toLowerCase(),
        normalizeItemKey(rate.item),
    ].join('|');
}

const PRIMARY_RATES = [
    ...PRIMARY_RATE_ROWS.flatMap(([category, item, dry, wash, steam]) => [
        dry && exactPriceItem(item, category, 'Dry Clean', dry),
        wash && exactPriceItem(item, category, 'Wash & Iron', wash),
        steam && exactPriceItem(item, category, 'Steam Iron', steam),
    ].filter(Boolean)),
    ...HOTEL_RATES.map(([item, price]) => exactPriceItem(item, 'Hotel', 'Hotel Linen', price)),
    ...WASH_ONLY_RATES.map(([category, item, price]) => exactPriceItem(item, category, 'Wash Only', price)),
    ...SHOE_CLEANING_RATES.map(([item, price]) => exactPriceItem(item, 'Shoes', 'Shoe Cleaning', price)),
];

function mergeRatesWithPrimary(existingRates = []) {
    const primaryByKey = new Map(PRIMARY_RATES.map(rate => [rateKey(rate), rate]));
    const merged = [];
    const mergedKeys = new Set();

    existingRates.forEach(rate => {
        const plainRate = typeof rate.toObject === 'function' ? rate.toObject() : rate;
        const normalized = normalizeRate(plainRate);
        if (normalized.serviceType === 'Iron') return; // Exclude redundant Iron service
        const key = rateKey(normalized);
        if (mergedKeys.has(key)) return;
        const primaryRate = primaryByKey.get(key);
        const isAdminOverride = normalized.source === 'admin-rate-card' || normalized.locked === false;
        merged.push(primaryRate && !isAdminOverride ? primaryRate : normalized);
        mergedKeys.add(key);
    });

    PRIMARY_RATES.forEach(rate => {
        if (!mergedKeys.has(rateKey(rate))) {
            merged.push(rate);
            mergedKeys.add(rateKey(rate));
        }
    });

    return merged;
}

module.exports = {
    PRIMARY_RATE_VERSION,
    PRIMARY_RATE_ROWS,
    HOTEL_RATES,
    WASH_ONLY_RATES,
    SHOE_CLEANING_RATES,
    PRIMARY_RATES,
    exactPriceItem,
    mergeRatesWithPrimary,
    normalizeCategory,
    normalizeItemKey,
    rateKey,
};
