import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import sendEmail from '../lib/sendEmail.js';

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Vérification mot de passe complexe
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          'Mot de passe trop faible. Minimum 8 caractères, avec majuscule, minuscule, chiffre et caractère spécial.',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email déjà utilisé' });

    // Création user
    const user = new User({ firstName, lastName, email, isVerified: false });

    // Hasher le mot de passe
    await user.setPassword(password);

    // Générer token de vérification + expiration 24h
    const token = crypto.randomBytes(32).toString('hex');
    user.verificationToken = token;
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h

    await user.save();

    // Envoyer email de vérification
    await sendEmail({
      to: email,
      subject: 'Vérifiez votre email',
      html: `<p>Bonjour ${firstName},</p>
             <p>Cliquez sur ce lien pour activer votre compte (valable 24h) :</p>
             <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}">Activer mon compte</a>`,
    });

    res.status(201).json({ message: 'Compte créé, vérifiez votre email' });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/auth/verify-email?token=...
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Token manquant' });

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Token invalide ou expiré' });

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    res.status(200).json({ message: 'Email vérifié avec succès !' });
  } catch (err) {
    console.error('VERIFY EMAIL ERROR:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Email ou mot de passe incorrect' });

    if (!user.isActive) {
      return res.status(403).json({
        message: "Votre compte n'est pas activé. Veuillez contacter un administrateur.",
      });
    }

    if (!user.isVerified)
      return res.status(403).json({ message: 'Veuillez vérifier votre email avant de vous connecter' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(400).json({ message: 'Email ou mot de passe incorrect' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: 'Connecté avec succès', role: user.role });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.status(200).json({ message: 'Déconnecté avec succès' });
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // 🔐 sécurité : toujours OK
    if (!user) {
      return res.status(200).json({
        message: 'Si cet email existe, un lien a été envoyé.',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1h
    await user.save();

    await sendEmail({
      to: email,
      subject: 'Réinitialisation du mot de passe',
      html: `
        <p>Bonjour ${user.firstName},</p>
        <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">
          Réinitialiser mon mot de passe
        </a>
        <p>Ce lien expire dans 1 heure.</p>
      `,
    });

    res.json({
      message: 'Si cet email existe, un lien a été envoyé.',
    });
  } catch (err) {
    console.error('FORGOT PASSWORD ERROR:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token et mot de passe requis' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Token invalide ou expiré' });
    }

    await user.setPassword(password);

    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
