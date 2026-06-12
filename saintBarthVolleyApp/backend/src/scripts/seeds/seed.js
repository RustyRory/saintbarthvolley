import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../../models/User.js';
import Club from '../../models/Club.js';

dotenv.config();

const clubData = {
  name: 'Saint Barthélémy Volley-Ball',
  subtitle: 'Passion, Performance, Partage',
  homeDescription:
    "Bienvenue sur le site officiel du Saint Barthélémy Volley-Ball, le club où la passion du volley rencontre l'esprit d'équipe et la convivialité.",
  clubDescription:
    "Le club propose des entraînements pour tous les niveaux, des jeunes aux seniors, dans un esprit de partage et de progression.",
  ownerDescription:
    "Notre équipe dirigeante est composée de bénévoles passionnés, engagés pour le développement du volley-ball à Saint-Barthélémy.",
  logo: '/assets/images/default_logo.png',
  photo: '/assets/images/default_club_photo.png',
  email: 'contact@saintbarthvolley.fr',
  phone: '(+33) 02 41 XX XX XX',
  address: 'Saint-Barthélemy, Caraïbes',
  social_links: {
    facebook: '',
    instagram: '',
    youtube: '',
    sporteasy: '',
    clubMerch: '',
    clubRegistration: '',
    website: '',
    other: '',
  },
  legal_info: {
    associationName: 'Saint Barth Volley-Ball',
    legalForm: 'Association loi 1901',
    siret: '',
    rna: '',
    headOffice: 'Saint-Barthélemy',
    publicationDate: null,
    responsible: '',
    hostingProvider: '',
    updatedAt: null,
  },
};

const seedAdmin = async () => {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans le .env');
  }

  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log('⚠️  Admin déjà existant :', existing.email);
    return;
  }

  const admin = new User({
    email: process.env.ADMIN_EMAIL,
    firstName: 'Admin',
    lastName: 'Root',
    role: 'admin',
    isActive: true,
    isVerified: true,
  });

  await admin.setPassword(process.env.ADMIN_PASSWORD);
  await admin.save();

  console.log('✅ Admin créé');
  console.log('   Email    :', admin.email);
  console.log('   Password :', process.env.ADMIN_PASSWORD);
};

const seedClub = async () => {
  const existing = await Club.findOne({});
  if (existing) {
    console.log('⚠️  Club déjà existant, ignoré.');
    return;
  }

  const club = new Club(clubData);
  await club.save();
  console.log('✅ Club seedé');
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connecté à MongoDB\n');

    await seedAdmin();
    await seedClub();

    console.log('\n🎉 Seed terminé.');
  } catch (err) {
    console.error('❌ Erreur seed :', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

run();
