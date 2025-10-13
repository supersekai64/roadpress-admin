import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSmsReportData() {
  console.log('🌱 Génération des données SMS de test pour les rapports...');

  // Récupérer le client "Client Test"
  const clientTest = await prisma.license.findFirst({
    where: { clientName: 'Client Test' },
  });

  if (!clientTest) {
    console.error('❌ Client Test non trouvé. Veuillez d\'abord exécuter le seed principal.');
    return;
  }

  console.log(`✅ Client Test trouvé: ${clientTest.id}`);

  // Supprimer les anciennes données de test
  await prisma.smsLog.deleteMany({
    where: { licenseId: clientTest.id },
  });

  console.log('🗑️  Anciennes données SMS supprimées');

  // Pays avec leurs coûts SMS réels
  const countries = [
    { name: 'France', code: 'FR', cost: 0.0475 },
    { name: 'Belgique', code: 'BE', cost: 0.0523 },
    { name: 'Suisse', code: 'CH', cost: 0.0389 },
    { name: 'Allemagne', code: 'DE', cost: 0.0725 },
    { name: 'Espagne', code: 'ES', cost: 0.0562 },
    { name: 'Italie', code: 'IT', cost: 0.0498 },
    { name: 'Royaume-Uni', code: 'GB', cost: 0.0417 },
    { name: 'Portugal', code: 'PT', cost: 0.0452 },
    { name: 'Pays-Bas', code: 'NL', cost: 0.0691 },
    { name: 'Luxembourg', code: 'LU', cost: 0.0334 },
  ];

  const currentYear = 2025;
  let totalSmsCreated = 0;

  // Générer des données pour les 12 derniers mois
  for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    const targetDate = new Date(currentYear, 9 - monthOffset, 1); // À partir d'octobre 2025
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Nombre de SMS variable selon le mois (plus actif en début d'année)
    const baseSmsCount = Math.floor(Math.random() * 100) + 80; // Entre 80 et 180 SMS par mois

    console.log(`📅 Génération pour ${targetDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}...`);

    const smsLogs = [];

    for (let i = 0; i < baseSmsCount; i++) {
      // Date aléatoire dans le mois
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      const hour = Math.floor(Math.random() * 24);
      const minute = Math.floor(Math.random() * 60);
      const sendDate = new Date(year, month, day, hour, minute);

      // Sélectionner un pays aléatoire avec pondération (France plus fréquent)
      let selectedCountry;
      const random = Math.random();
      if (random < 0.5) {
        // 50% France
        selectedCountry = countries[0];
      } else if (random < 0.7) {
        // 20% Belgique
        selectedCountry = countries[1];
      } else if (random < 0.85) {
        // 15% Suisse
        selectedCountry = countries[2];
      } else {
        // 15% autres pays
        selectedCountry = countries[Math.floor(Math.random() * (countries.length - 3)) + 3];
      }

      // Générer un numéro de téléphone fictif
      const phoneNumber = `+${selectedCountry.code === 'FR' ? '33' : ''}${Math.floor(Math.random() * 900000000) + 100000000}`;

      // 95% delivered, 5% failed
      const status = Math.random() < 0.95 ? 'delivered' : 'failed';

      smsLogs.push({
        licenseId: clientTest.id,
        phone: phoneNumber,
        country: selectedCountry.name,
        status,
        cost: selectedCountry.cost,
        sendDate,
        createdAt: sendDate,
      });

      totalSmsCreated++;
    }

    // Insérer tous les SMS du mois en une seule fois
    await prisma.smsLog.createMany({
      data: smsLogs,
    });

    console.log(`   ✅ ${smsLogs.length} SMS générés`);
  }

  // Calculer et afficher les statistiques finales
  const allLogs = await prisma.smsLog.findMany({
    where: { licenseId: clientTest.id },
  });

  const totalCost = allLogs.reduce((sum, log) => sum + Number(log.cost), 0);
  const deliveredCount = allLogs.filter((log) => log.status === 'delivered').length;

  console.log('\n📊 Résumé des données générées:');
  console.log(`   • Total SMS créés: ${totalSmsCreated}`);
  console.log(`   • SMS délivrés: ${deliveredCount}`);
  console.log(`   • SMS échoués: ${totalSmsCreated - deliveredCount}`);
  console.log(`   • Coût total: ${totalCost.toFixed(2)} €`);
  console.log(`   • Période: ${new Date(2024, 10, 1).toLocaleDateString('fr-FR')} - ${new Date(2025, 9, 31).toLocaleDateString('fr-FR')}`);

  // Compter par pays
  const countryStats: Record<string, number> = {};
  allLogs.forEach((log) => {
    if (log.country) {
      countryStats[log.country] = (countryStats[log.country] || 0) + 1;
    }
  });

  console.log('\n🌍 Répartition par pays:');
  Object.entries(countryStats)
    .sort(([, a], [, b]) => b - a)
    .forEach(([country, count]) => {
      console.log(`   • ${country}: ${count} SMS`);
    });

  console.log('\n✅ Données de test générées avec succès!');
}

seedSmsReportData()
  .catch((e) => {
    console.error('❌ Erreur lors de la génération des données:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
