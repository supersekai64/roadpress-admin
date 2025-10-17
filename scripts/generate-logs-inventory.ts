/**
 * Script pour générer un inventaire complet de tous les logs possibles
 * Scanne automatiquement le code pour détecter tous les appels à DebugLogger.log()
 * Génère un fichier Excel avec toutes les entrées de logs existantes dans l'application
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

interface LogEntry {
  Fichier: string;
  Ligne: number;
  Catégorie: string;
  Action: string;
  Méthode: string;
  Endpoint: string;
  Statut: string;
  Message: string;
}

/**
 * Extrait les informations d'un appel DebugLogger.log() depuis le code source
 */
function extractLogInfo(content: string, lineNumber: number, filePath: string): Partial<LogEntry> | null {
  const lines = content.split('\n');
  const line = lines[lineNumber - 1];
  
  // Vérifier si la ligne contient un appel à DebugLogger.log
  if (!line.includes('DebugLogger.log') && !line.includes('await DebugLogger.log')) {
    return null;
  }
  
  // Trouver le début et la fin de l'objet passé à log()
  let startLine = lineNumber - 1;
  let endLine = lineNumber - 1;
  
  // Remonter pour trouver le début si l'appel commence avant
  while (startLine > 0 && !lines[startLine].includes('DebugLogger.log')) {
    startLine--;
  }
  
  // Descendre pour trouver la fin de l'objet
  let braceCount = 0;
  let inObject = false;
  for (let i = startLine; i < lines.length; i++) {
    const currentLine = lines[i];
    for (const char of currentLine) {
      if (char === '{') {
        braceCount++;
        inObject = true;
      }
      if (char === '}') {
        braceCount--;
        if (inObject && braceCount === 0) {
          endLine = i;
          break;
        }
      }
    }
    if (inObject && braceCount === 0) break;
  }
  
  // Extraire le code complet
  const codeBlock = lines.slice(startLine, endLine + 1).join('\n');
  
  // Extraire les propriétés avec regex améliorées
  const categoryMatch = codeBlock.match(/category:\s*['"`](\w+)['"`]/);
  const actionMatch = codeBlock.match(/action:\s*['"`]([^'"`]+)['"`]/);
  const statusMatch = codeBlock.match(/status:\s*['"`](\w+)['"`]/);
  
  // Extraction améliorée du message pour gérer les template literals et caractères spéciaux
  let message = 'N/A';
  
  // Chercher d'abord les template literals avec backticks (utiliser . au lieu de [^`])
  const templateLiteralMatch = codeBlock.match(/message:\s*`([\s\S]*?)`/);
  if (templateLiteralMatch) {
    // Nettoyer les sauts de ligne et espaces multiples
    message = templateLiteralMatch[1]
      .replace(/\$\{[^}]+\}/g, '[VARIABLE]') // Remplacer les ${...} par [VARIABLE]
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim();
  } else {
    // Chercher les strings avec guillemets doubles qui peuvent contenir des échappements
    const doubleQuoteMatch = codeBlock.match(/message:\s*"((?:[^"\\]|\\.)*)"/);
    if (doubleQuoteMatch) {
      message = doubleQuoteMatch[1]
        .replace(/\\n/g, ' ') // Remplacer les \n par espaces
        .replace(/\\'/g, "'") // Convertir \' en '
        .replace(/\\"/g, '"') // Convertir \" en "
        .replace(/\\\\/g, '\\') // Convertir \\ en \
        .replace(/\s+/g, ' ') // Normaliser les espaces
        .trim();
    } else {
      // Sinon chercher les strings avec quotes simples
      const singleQuoteMatch = codeBlock.match(/message:\s*'((?:[^'\\]|\\.)*)'/);
      if (singleQuoteMatch) {
        message = singleQuoteMatch[1]
          .replace(/\\n/g, ' ') // Remplacer les \n par espaces
          .replace(/\\'/g, "'") // Convertir \' en '
          .replace(/\\"/g, '"') // Convertir \" en "
          .replace(/\\\\/g, '\\') // Convertir \\ en \
          .replace(/\s+/g, ' ') // Normaliser les espaces
          .trim();
      }
    }
  }
  
  // Extraire la méthode HTTP (GET, POST, etc.)
  const methodMatch = content.match(/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/);
  
  // Extraire l'endpoint depuis le chemin du fichier
  let endpoint = '';
  if (filePath.includes('src/app/api/')) {
    const apiPath = filePath.split('src/app/api/')[1];
    endpoint = '/api/' + apiPath.replace(/\/route\.ts$/, '').replace(/\\/g, '/');
  } else if (filePath.includes('src\\app\\api\\')) {
    const apiPath = filePath.split('src\\app\\api\\')[1];
    endpoint = '/api/' + apiPath.replace(/\\route\.ts$/, '').replace(/\\/g, '/');
  } else if (filePath.includes('src/lib/')) {
    endpoint = 'Library';
  } else if (filePath.includes('src\\lib\\')) {
    endpoint = 'Library';
  }
  
  return {
    Fichier: filePath.replace(/\\/g, '/'),
    Ligne: lineNumber,
    Catégorie: categoryMatch ? categoryMatch[1] : 'UNKNOWN',
    Action: actionMatch ? actionMatch[1] : 'UNKNOWN',
    Méthode: methodMatch ? methodMatch[1] : 'N/A',
    Endpoint: endpoint,
    Statut: statusMatch ? statusMatch[1] : 'UNKNOWN',
    Message: message,
  };
}

/**
 * Scanne tous les fichiers TypeScript pour trouver les appels à DebugLogger.log()
 */
function scanFilesForLogs(): LogEntry[] {
  const logsInventory: LogEntry[] = [];
  
  // Chercher tous les fichiers .ts et .tsx dans src/
  const files = globSync('src/**/*.{ts,tsx}', {
    ignore: ['**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
    cwd: process.cwd(),
    absolute: false,
  });
  
  console.log(`🔍 Scanning ${files.length} fichiers...`);
  
  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    // Parcourir chaque ligne
    lines.forEach((line, index) => {
      if (line.includes('DebugLogger.log') || line.includes('await DebugLogger.log')) {
        const logInfo = extractLogInfo(content, index + 1, file);
        if (logInfo && logInfo.Catégorie !== 'UNKNOWN') {
          logsInventory.push(logInfo as LogEntry);
        }
      }
    });
  }
  
  return logsInventory;
}

// ============================================================================
// GÉNÉRATION DE L'INVENTAIRE
// ============================================================================

console.log('🔍 Scan du code pour détecter les appels à DebugLogger.log()...\n');
const logsInventory = scanFilesForLogs();

if (logsInventory.length === 0) {
  console.log('⚠️  Aucun log trouvé. Vérifiez que DebugLogger.log() est utilisé dans le code.');
  process.exit(1);
}

// Trier par fichier puis ligne
logsInventory.sort((a, b) => {
  if (a.Fichier !== b.Fichier) {
    return a.Fichier.localeCompare(b.Fichier);
  }
  return a.Ligne - b.Ligne;
});

// Extraire les catégories uniques
const categories = Array.from(new Set(logsInventory.map(log => log.Catégorie))).sort();

console.log(`✅ ${logsInventory.length} entrées de log détectées\n`);

// ============================================================================
// GÉNÉRATION DU FICHIER EXCEL
// ============================================================================

// Créer le workbook
const wb = XLSX.utils.book_new();

// Convertir les données en feuille
const ws = XLSX.utils.json_to_sheet(logsInventory);

// Configurer la largeur des colonnes
const colWidths = [
  { wch: 50 }, // Fichier
  { wch: 8 },  // Ligne
  { wch: 15 }, // Catégorie
  { wch: 25 }, // Action
  { wch: 10 }, // Méthode
  { wch: 40 }, // Endpoint
  { wch: 10 }, // Statut
  { wch: 70 }, // Message
];

ws['!cols'] = colWidths;

// Ajouter la feuille au workbook
XLSX.utils.book_append_sheet(wb, ws, 'Inventaire Logs');

// Créer une feuille de résumé par catégorie
const summary: any[] = [];
const categoriesList = [...new Set(logsInventory.map(log => log.Catégorie))];

categoriesList.forEach(cat => {
  const logsInCat = logsInventory.filter(log => log.Catégorie === cat);
  const statuses = [...new Set(logsInCat.map(log => log.Statut))];
  
  summary.push({
    Catégorie: cat,
    'Total Logs': logsInCat.length,
    SUCCESS: logsInCat.filter(l => l.Statut === 'SUCCESS').length,
    ERROR: logsInCat.filter(l => l.Statut === 'ERROR').length,
    WARNING: logsInCat.filter(l => l.Statut === 'WARNING').length,
    INFO: logsInCat.filter(l => l.Statut === 'INFO').length,
  });
});

const wsSummary = XLSX.utils.json_to_sheet(summary);
wsSummary['!cols'] = [
  { wch: 20 },
  { wch: 12 },
  { wch: 10 },
  { wch: 10 },
  { wch: 10 },
  { wch: 10 },
];
XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé par Catégorie');

// Créer une feuille de résumé par statut
const statusSummary: any[] = [
  { Statut: 'SUCCESS', Nombre: logsInventory.filter(l => l.Statut === 'SUCCESS').length },
  { Statut: 'ERROR', Nombre: logsInventory.filter(l => l.Statut === 'ERROR').length },
  { Statut: 'WARNING', Nombre: logsInventory.filter(l => l.Statut === 'WARNING').length },
  { Statut: 'INFO', Nombre: logsInventory.filter(l => l.Statut === 'INFO').length },
  { Statut: 'TOTAL', Nombre: logsInventory.length },
];

const wsStatus = XLSX.utils.json_to_sheet(statusSummary);
wsStatus['!cols'] = [
  { wch: 15 },
  { wch: 10 },
];
XLSX.utils.book_append_sheet(wb, wsStatus, 'Résumé par Statut');

// Sauvegarder le fichier
const outputPath = path.join(process.cwd(), 'roadpress-logs-inventory.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`✅ Inventaire des logs généré avec succès : ${outputPath}`);
console.log(`📊 Total des entrées de log : ${logsInventory.length}`);
console.log(`📂 Catégories : ${categories.join(', ')}`);
