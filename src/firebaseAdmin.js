const admin = require("firebase-admin");

if (!admin.apps.length) {
  const privateKey = Buffer.from(
    process.env.FIREBASE_PRIVATE_KEY_B64,
    'base64'
  ).toString('utf8');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

module.exports = admin;