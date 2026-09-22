/**
 * Garage Marketplace - Standardized Car Brand Catalog
 * Organized by geographic region (American, European, Japanese).
 */

export const CAR_BRANDS_BY_REGION = {
  american: [
    'Buick',
    'Cadillac',
    'Chevrolet',
    'Chrysler',
    'Dodge',
    'Ford',
    'GMC',
    'Jeep',
    'Lincoln',
    'Lucid Motors',
    'Ram',
    'Rivian',
    'Tesla',
    'Vanderhall Motor Works'
  ],
  european: [
    'Alfa Romeo',
    'Alpine',
    'Aston Martin',
    'Audi',
    'Bentley',
    'BMW',
    'Bugatti',
    'Ferrari',
    'Fiat',
    'Jaguar',
    'Koenigsegg',
    'Lamborghini',
    'Land Rover',
    'Lotus',
    'Maserati',
    'McLaren',
    'Mercedes-Benz',
    'MINI',
    'Opel',
    'Pagani',
    'Peugeot',
    'Polestar',
    'Porsche',
    'Renault',
    'Rimac',
    'Rolls-Royce',
    'Volkswagen',
    'Volvo'
  ],
  japanese: [
    'Acura',
    'Daihatsu',
    'Honda',
    'Infiniti',
    'Isuzu',
    'Lexus',
    'Mazda',
    'Mitsubishi',
    'Mitsuoka',
    'Nissan',
    'Subaru',
    'Suzuki',
    'Toyota'
  ]
}

export const BRAND_REGIONS = [
  { region: 'Japanese Brands', key: 'japanese', brands: CAR_BRANDS_BY_REGION.japanese },
  { region: 'European Brands', key: 'european', brands: CAR_BRANDS_BY_REGION.european },
  { region: 'American Brands', key: 'american', brands: CAR_BRANDS_BY_REGION.american }
]

export const ALL_CAR_BRANDS = [
  ...CAR_BRANDS_BY_REGION.japanese,
  ...CAR_BRANDS_BY_REGION.european,
  ...CAR_BRANDS_BY_REGION.american
].sort((a, b) => a.localeCompare(b))
