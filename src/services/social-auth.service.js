import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "365d";

const ALLOWED_PROVIDERS = ["google", "facebook"];

const signAuthToken = (user) =>
  jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role || "User" },
    JWT_SECRET,
    { algorithm: "HS256", expiresIn: JWT_EXPIRES_IN }
  );

const buildAuthResponse = (user, token) => ({
  user_id: user.user_id,
  name: user.name,
  email: user.email,
  role: user.role || "User",
  authProvider: user.authProvider,
  token,
});

export const SocialAuthService = {
  socialAuth: async ({ email, name, socialId, provider }) => {
    const normalizedProvider = String(provider || "").trim().toLowerCase();

    if (!socialId) {
      throw new Error("socialId is required");
    }
    if (!normalizedProvider || !ALLOWED_PROVIDERS.includes(normalizedProvider)) {
      throw new Error("provider must be 'google' or 'facebook'");
    }

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedName = String(name || "").trim() || "User";
    const socialField = normalizedProvider === "google" ? "googleId" : "facebookId";

    // 1. Find by socialId
    let user = await User.findOne({ [socialField]: String(socialId).trim() }).exec();

    if (!user && normalizedEmail) {
      // 2. Find by email — link social account to existing local account
      user = await User.findOne({ email: normalizedEmail }).exec();
      if (user) {
        user[socialField] = String(socialId).trim();
        user.authProvider = normalizedProvider;
        await user.save();
      }
    }

    if (!user) {
      // 3. Create new social user
      user = await User.create({
        email: normalizedEmail,
        name: normalizedName,
        role: "User",
        [socialField]: String(socialId).trim(),
        authProvider: normalizedProvider,
        passwordHash: "",
      });
    }

    const token = signAuthToken(user);
    return buildAuthResponse(user, token);
  },
};

export default SocialAuthService;
