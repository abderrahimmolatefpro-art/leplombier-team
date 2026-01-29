// Script pour créer un utilisateur admin initial
// Usage: node scripts/create-admin.js

const admin = require('firebase-admin');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Note: Vous devez télécharger votre fichier de clé privée Firebase depuis la console Firebase
// et le placer dans le projet, ou utiliser les variables d'environnement

console.log(`
╔══════════════════════════════════════════════════════════════╗
║         Script de création d'utilisateur admin              ║
╚══════════════════════════════════════════════════════════════╝

Ce script vous aidera à créer un utilisateur admin dans Firestore.

IMPORTANT: 
1. Créez d'abord un utilisateur via Firebase Authentication (console Firebase)
2. Copiez l'UID de l'utilisateur
3. Exécutez ce script pour ajouter les données utilisateur dans Firestore

`);

rl.question('UID de l\'utilisateur Firebase: ', (uid) => {
  rl.question('Email: ', (email) => {
    rl.question('Nom: ', (name) => {
      rl.question('Téléphone (optionnel): ', (phone) => {
        const userData = {
          email,
          name,
          phone: phone || '',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        console.log('\nDonnées utilisateur à créer:');
        console.log(JSON.stringify(userData, null, 2));
        console.log('\nPour créer cet utilisateur dans Firestore:');
        console.log('1. Allez dans la console Firebase');
        console.log('2. Ouvrez Firestore Database');
        console.log(`3. Créez un document dans la collection "users" avec l'ID: ${uid}`);
        console.log('4. Ajoutez les champs suivants:');
        console.log(`   - email: ${email}`);
        console.log(`   - name: ${name}`);
        console.log(`   - phone: ${phone || '(vide)'}`);
        console.log('   - role: admin');
        console.log('   - createdAt: (timestamp actuel)');
        console.log('   - updatedAt: (timestamp actuel)');

        rl.close();
      });
    });
  });
});
