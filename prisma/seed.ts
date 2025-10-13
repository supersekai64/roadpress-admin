import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed de la base de données...');

  // Créer un utilisateur admin par défaut
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@roadpress.com' },
    update: {},
    create: {
      email: 'admin@roadpress.com',
      password: hashedPassword,
      name: 'Administrateur',
      role: 'admin',
    },
  });

  console.log('✅ Utilisateur admin créé:', admin.email);

  // Créer une licence de test
  const testLicense = await prisma.license.upsert({
    where: { licenseKey: 'TEST1234567890AB' },
    update: {},
    create: {
      licenseKey: 'TEST1234567890AB',
      clientName: 'Client Test',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      status: 'ACTIVE',
      siteUrl: 'http://localhost:3000',
      isAssociated: true,
    },
  });

  console.log('✅ Licence de test créée:', testLicense.licenseKey);

  // Créer des statistiques Email de test (derniers 7 jours)
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    await prisma.emailStats.create({
      data: {
        license: { connect: { id: testLicense.id } },
        emailsSent: Math.floor(Math.random() * 100) + 50,
        emailsDelivered: Math.floor(Math.random() * 90) + 45,
        emailsOpened: Math.floor(Math.random() * 60) + 30,
        emailsClicked: Math.floor(Math.random() * 30) + 10,
        emailsBounced: Math.floor(Math.random() * 5),
        emailsSpam: Math.floor(Math.random() * 3),
        createdAt: date,
      },
    });
  }

  console.log('✅ Statistiques Email créées (7 jours)');

  // Créer des statistiques SMS de test
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const smsSent = Math.floor(Math.random() * 50) + 20;
    const smsDelivered = Math.floor(Math.random() * 45) + 18;

    await prisma.smsStats.create({
      data: {
        license: { connect: { id: testLicense.id } },
        smsSent,
        smsDelivered,
        smsFailed: smsSent - smsDelivered,
        totalCost: (smsSent * 0.05).toString(),
        createdAt: date,
      },
    });
  }

  console.log('✅ Statistiques SMS créées (7 jours)');

  // Créer des statistiques DeepL de test
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    await prisma.deeplStats.create({
      data: {
        license: { connect: { id: testLicense.id } },
        translationsCount: Math.floor(Math.random() * 30) + 10,
        charactersTranslated: Math.floor(Math.random() * 5000) + 2000,
        createdAt: date,
      },
    });
  }

  console.log('✅ Statistiques DeepL créées (7 jours)');

  // Créer des statistiques OpenAI de test
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const promptTokens = Math.floor(Math.random() * 5000) + 1000;
    const completionTokens = Math.floor(Math.random() * 3000) + 500;

    await prisma.openaiStats.create({
      data: {
        license: { connect: { id: testLicense.id } },
        requestsCount: Math.floor(Math.random() * 20) + 5,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        totalCost: ((promptTokens * 0.00003) + (completionTokens * 0.00006)).toString(),
        createdAt: date,
      },
    });
  }

  console.log('✅ Statistiques OpenAI créées (7 jours)');

  // Créer les clés API par défaut (vides)
  const apiServices = ['deepl', 'openai', 'brevo', 'mapbox'];

  for (const service of apiServices) {
    const apiKey = await prisma.apiKey.upsert({
      where: { service },
      update: {},
      create: {
        service,
        key: '',
        isActive: false,
      },
    });
    console.log(`✅ Clé API ${service} initialisée`);
  }

  // Créer des POI de test (points d'intérêt en France)
  const poisData = [
    {
      name: 'Tour Eiffel',
      latitude: 48.8584,
      longitude: 2.2945,
      visitCount: Math.floor(Math.random() * 1000) + 100,
    },
    {
      name: 'Mont Saint-Michel',
      latitude: 48.6361,
      longitude: -1.5115,
      visitCount: Math.floor(Math.random() * 800) + 50,
    },
    {
      name: 'Château de Versailles',
      latitude: 48.8049,
      longitude: 2.1204,
      visitCount: Math.floor(Math.random() * 900) + 80,
    },
    {
      name: 'Cathédrale Notre-Dame de Paris',
      latitude: 48.8530,
      longitude: 2.3499,
      visitCount: Math.floor(Math.random() * 700) + 60,
    },
    {
      name: 'Cité de Carcassonne',
      latitude: 43.2061,
      longitude: 2.3652,
      visitCount: Math.floor(Math.random() * 600) + 40,
    },
    {
      name: 'Palais des Papes (Avignon)',
      latitude: 43.9509,
      longitude: 4.8075,
      visitCount: Math.floor(Math.random() * 500) + 30,
    },
    {
      name: 'Château de Chambord',
      latitude: 47.6169,
      longitude: 1.5172,
      visitCount: Math.floor(Math.random() * 650) + 45,
    },
    {
      name: 'Arc de Triomphe',
      latitude: 48.8738,
      longitude: 2.2950,
      visitCount: Math.floor(Math.random() * 850) + 70,
    },
  ];

  for (let i = 0; i < poisData.length; i++) {
    const poiData = poisData[i];
    await prisma.poi.create({
      data: {
        ...poiData,
        poiId: `POI${String(i + 1).padStart(3, '0')}`,
        license: { connect: { id: testLicense.id } },
        seasonData: JSON.stringify({}),
        syncDate: new Date(),
      },
    });
  }

  console.log('✅ POI de test créés (8 monuments français)');

  console.log('🎉 Seed terminé avec succès!');
  console.log('\n📝 Credentials de test:');
  console.log('   Email: admin@roadpress.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
