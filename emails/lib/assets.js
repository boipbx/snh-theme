// Every image the emails use: absolute https URLs on Shopify's CDN (Files: /files/…, theme assets: /t/36/assets/…, the
// asset folder of theme 189832462590). WebP photos are requested as progressive JPEG (format=pjpg) for Outlook.
const F = 'https://cdn.shopify.com/s/files/1/0258/9625/5550/files/';
const T = 'https://cdn.shopify.com/s/files/1/0258/9625/5550/t/36/assets/';
module.exports = {
  logo: F + 'sn_o.png?width=360',
  koko: T + 'snh-koko.png',
  sisLogo: F + 'Untitled_design.zip_-_5_62bbd74a-3d19-426e-b1a6-f626a977e647.png?width=240',
  photoCricket: F + 'cricket.jpg?width=1200',
  photoRunning: F + 'running.jpg?width=1200',
  photoDehiwala: F + 'snh_dehiwala.webp?width=1200&format=pjpg',
  photoNugegoda: F + 'snhnuge.webp?width=1200&format=pjpg',
  photoWattala: F + 'snhwttla.webp?width=1200&format=pjpg',
  photoInstore: F + 'instore.webp?width=1200&format=pjpg',
  photoInside: F + 'khizerinsid.webp?width=1200&format=pjpg',
  pWhey: F + 'CriticalWheyProtein2kgbyAppliedNutritionfromSportsNutritionHub_6.png?width=400',
  pCreatine: F + '2_3ef6e203-bf8f-4730-9d50-0531c9412579.png?width=400',
  pGel: F + 'GoIsotonicEnergyGelsbyScienceInSportfromSportsNutritionHub_7.png?width=400',
  pShaker: F + 'ShakerBottle750ml-OrangebySNHfromSportsNutritionHub.png?width=400',
};
