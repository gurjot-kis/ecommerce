import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

const normalizeName = (value) => String(value).trim();
const normalizeEmail = (value) => String(value).trim().toLowerCase();

const buildUserResponse = (user) => ({
  user_id: user.user_id,
  fullName: user.name,
  email: user.email,
  phone: user.phone || "",
  address: user.address || "",
});

export const UserService = {
  getUsers: async ({ page = 1, limit = 10, search = "" } = {}) => {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = { role: "User" };

    if (search && String(search).trim()) {
      const regex = new RegExp(String(search).trim(), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select("user_id name email phone address -_id")
        .lean()
        .exec(),
      User.countDocuments(filter),
    ]);

    const mapped = users.map((u) => ({
      user_id: u.user_id,
      fullName: u.name,
      email: u.email,
      phone: u.phone || "",
      address: u.address || "",
    }));

    return {
      users: mapped,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
        hasNextPage: parsedPage < Math.ceil(total / parsedLimit),
        hasPrevPage: parsedPage > 1,
      },
    };
  },

  getUserById: async ({ user_id }) => {
    if (!user_id) {
      throw new Error("user_id is required");
    }

    const user = await User.findOne({ user_id: String(user_id).trim(), role: "User" })
      .select("user_id name email phone address -_id")
      .lean()
      .exec();

    if (!user) {
      throw new Error("User not found");
    }

    return {
      user_id: user.user_id,
      fullName: user.name,
      email: user.email,
      phone: user.phone || "",
      address: user.address || "",
    };
  },

  addUser: async ({ fullName, email, password, phone, address }) => {
    if (!fullName || !email || !password) {
      throw new Error("fullName, email, and password are required");
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedName = normalizeName(fullName);

    const existing = await User.findOne({ email: normalizedEmail }).exec();
    if (existing) {
      throw new Error("User already exists");
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : "",
      address: address ? String(address).trim() : "",
      role: "User",
      passwordHash,
    });

    return buildUserResponse(user);
  },

  // PUT — replace all updatable fields (password optional)
  updateUser: async ({ user_id, fullName, email, password, phone, address }) => {
    if (!user_id) {
      throw new Error("user_id is required");
    }

    if (!fullName || !email) {
      throw new Error("fullName and email are required");
    }

    const user = await User.findOne({ user_id: String(user_id).trim(), role: "User" }).exec();
    if (!user) {
      throw new Error("User not found");
    }

    const normalizedEmail = normalizeEmail(email);

    const duplicate = await User.findOne({
      email: normalizedEmail,
      user_id: { $ne: String(user_id).trim() },
    }).exec();

    if (duplicate) {
      throw new Error("Email already in use");
    }

    user.name = normalizeName(fullName);
    user.email = normalizedEmail;
    if (password) {
      user.passwordHash = await bcrypt.hash(String(password), 10);
    }
    user.phone = phone ? String(phone).trim() : "";
    user.address = address ? String(address).trim() : "";

    await user.save();

    return buildUserResponse(user);
  },

  // PATCH — partial update (at least one field required)
  editUser: async ({ user_id, fullName, email, password, phone, address }) => {
    if (!user_id) {
      throw new Error("user_id is required");
    }

    if (!fullName && !email && !password && phone === undefined && address === undefined) {
      throw new Error("At least one of fullName, email, password, phone, or address is required");
    }

    const user = await User.findOne({ user_id: String(user_id).trim(), role: "User" }).exec();
    if (!user) {
      throw new Error("User not found");
    }

    if (email) {
      const normalizedEmail = normalizeEmail(email);
      const duplicate = await User.findOne({
        email: normalizedEmail,
        user_id: { $ne: String(user_id).trim() },
      }).exec();

      if (duplicate) {
        throw new Error("Email already in use");
      }

      user.email = normalizedEmail;
    }

    if (fullName) {
      user.name = normalizeName(fullName);
    }

    if (password) {
      user.passwordHash = await bcrypt.hash(String(password), 10);
    }

    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }

    if (address !== undefined) {
      user.address = String(address).trim();
    }

    await user.save();

    return buildUserResponse(user);
  },
};

export default UserService;
