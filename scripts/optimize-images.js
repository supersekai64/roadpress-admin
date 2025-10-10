const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { glob } = require('glob');

// Configuration
const CONFIG = {
  inputDir: 'public',
  outputDir: 'public/optimized',
  cacheFile: '.image-cache.json',
  formats: ['webp', 'avif'],
  quality: {
    webp: 80,
    avif: 65,
  },
  // Extensions d'images sources a traiter
  sourceExtensions: ['png', 'jpg', 'jpeg'],
};

// Charger le cache
function loadCache() {
  try {
    if (fs.existsSync(CONFIG.cacheFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.cacheFile, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️  Impossible de charger le cache:', error.message);
  }
  return {};
}

// Sauvegarder le cache
function saveCache(cache) {
  try {
    fs.writeFileSync(CONFIG.cacheFile, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde du cache:', error.message);
  }
}

// Calculer le hash d'un fichier
function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

// Verifier si une image a change
function hasImageChanged(filePath, cache) {
  const currentHash = getFileHash(filePath);
  const cachedHash = cache[filePath]?.hash;
  return currentHash !== cachedHash;
}

// Optimiser une image
async function optimizeImage(inputPath, cache) {
  const fileName = path.basename(inputPath, path.extname(inputPath));
  const relativePath = path.relative(CONFIG.inputDir, path.dirname(inputPath));
  const outputDir = path.join(CONFIG.outputDir, relativePath);

  // Creer le dossier de sortie si necessaire
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const stats = fs.statSync(inputPath);
  const fileHash = getFileHash(inputPath);

  // Verifier si l'image a deja ete traitee
  if (cache[inputPath] && cache[inputPath].hash === fileHash) {
    console.log(`⏭️  Ignore (deja optimise): ${inputPath}`);
    return cache[inputPath];
  }

  console.log(`🔄 Traitement: ${inputPath}`);

  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const results = {
    hash: fileHash,
    originalSize: stats.size,
    originalPath: inputPath,
    formats: {},
  };

  // Generer les formats optimises
  for (const format of CONFIG.formats) {
    const outputPath = path.join(outputDir, `${fileName}.${format}`);

    try {
      await image
        .clone()
        [format]({ quality: CONFIG.quality[format] })
        .toFile(outputPath);

      const outputStats = fs.statSync(outputPath);
      const reduction = ((1 - outputStats.size / stats.size) * 100).toFixed(1);

      results.formats[format] = {
        path: outputPath,
        size: outputStats.size,
        reduction: `${reduction}%`,
      };

      console.log(
        `  ✅ ${format.toUpperCase()}: ${(outputStats.size / 1024).toFixed(1)}KB (reduction: ${reduction}%)`
      );
    } catch (error) {
      console.error(`  ❌ Erreur ${format.toUpperCase()}:`, error.message);
    }
  }

  return results;
}

// Fonction principale
async function processImages() {
  console.log('\n🖼️  Optimisation des images\n');
  console.log(`📁 Dossier source: ${CONFIG.inputDir}`);
  console.log(`📂 Dossier destination: ${CONFIG.outputDir}`);
  console.log(`🎨 Formats: ${CONFIG.formats.join(', ').toUpperCase()}\n`);

  const cache = loadCache();
  const pattern = `${CONFIG.inputDir}/**/*.{${CONFIG.sourceExtensions.join(',')}}`;
  const images = await glob(pattern, { nodir: true });

  if (images.length === 0) {
    console.log('ℹ️  Aucune image a traiter\n');
    return;
  }

  console.log(`📊 ${images.length} image(s) trouvee(s)\n`);

  let processed = 0;
  let skipped = 0;

  for (const imagePath of images) {
    try {
      if (hasImageChanged(imagePath, cache)) {
        const result = await optimizeImage(imagePath, cache);
        cache[imagePath] = result;
        processed++;
      } else {
        console.log(`⏭️  Ignore (deja optimise): ${imagePath}`);
        skipped++;
      }
    } catch (error) {
      console.error(`❌ Erreur lors du traitement de ${imagePath}:`, error.message);
    }
  }

  saveCache(cache);

  console.log('\n✨ Optimisation terminee !');
  console.log(`   - Images traitees: ${processed}`);
  console.log(`   - Images ignorees (cache): ${skipped}`);
  console.log(`   - Total: ${images.length}\n`);
}

// Executer
processImages().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
