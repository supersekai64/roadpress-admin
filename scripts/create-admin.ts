import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminAsync() {
  try {
    console.log('Création de l\'utilisateur administrateur...\n');

    const email = 'email@domaine.com';
    const name = 'Prénom NOM';
    const password = 'password123';

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`L'utilisateur ${email} existe déjà`);
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Nom: ${existingUser.name}`);
      console.log(`   Rôle: ${existingUser.role}`);
      console.log('\nAucune action nécessaire\n');
      return;
    }

    // Hasher le mot de passe
    const hashedPassword = await hash(password, 12);

    // Créer l'utilisateur admin
    const admin = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log('Utilisateur administrateur créé avec succès !\n');
    console.log('Informations :');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Nom: ${admin.name}`);
    console.log(`   Rôle: ${admin.role}`);
    console.log(`   Créé le: ${admin.createdAt}`);
    console.log('\nIdentifiants de connexion :');
    console.log(`   Email: ${email}`);
    console.log(`   Mot de passe: ${password}`);
    console.log('\nVous pouvez maintenant vous connecter !\n');

  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdminAsync()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
