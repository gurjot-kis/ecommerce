import { SocialAuthService } from "../services/social-auth.service.js";

const sendError = (res, code, message) =>
  res.status(code).json({ success: false, code, message, data: null });

export const SocialAuthController = {
  socialAuth: async (req, res) => {
    try {
      const { email, name, socialId, provider } = req.body || {};
      const data = await SocialAuthService.socialAuth({ email, name, socialId, provider });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Login successful",
        data,
      });
    } catch (err) {
      const message = err?.message || "Social authentication failed";
      return sendError(res, 400, message);
    }
  },
};

export default SocialAuthController;
