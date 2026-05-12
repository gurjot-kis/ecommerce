import Address from "../models/address.model.js";

const normalizeString = (value) => String(value || "").trim();

const normalizeId = (value) => normalizeString(value).replace(/^:/, "");

const mapAddress = (address) => ({
  address_id: address.address_id,
  user_id: address.user_id,
  fullName: address.fullName,
  phone: address.phone,
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2 || "",
  landmark: address.landmark || "",
  city: address.city,
  state: address.state,
  country: address.country,
  pincode: address.pincode,
  isDefault: Boolean(address.isDefault),
  createdAt: address.createdAt,
  updatedAt: address.updatedAt,
});

const setDefaultAddress = async (user_id, address_id) => {
  await Address.updateMany(
    { user_id, address_id: { $ne: address_id }, isDefault: true },
    { $set: { isDefault: false } }
  ).exec();
};

export const AddressService = {
  setDefaultAddress: async ({ user_id, address_id }) => {
    const normalizedUserId = normalizeId(user_id);
    const normalizedAddressId = normalizeId(address_id);

    if (!normalizedUserId) {
      throw new Error("user_id is required");
    }
    if (!normalizedAddressId) {
      throw new Error("address_id is required");
    }

    const target = await Address.findOne({
      user_id: normalizedUserId,
      address_id: normalizedAddressId,
    }).exec();

    if (!target) {
      throw new Error("Address not found");
    }

    await Address.updateMany({ user_id: normalizedUserId }, { $set: { isDefault: false } }).exec();
    target.isDefault = true;
    await target.save();

    return mapAddress(target);
  },

  addAddress: async ({
    user_id,
    fullName,
    phone,
    addressLine1,
    addressLine2,
    landmark,
    city,
    state,
    country,
    pincode,
    isDefault,
  }) => {
    const normalizedUserId = normalizeId(user_id);
    if (!normalizedUserId) {
      throw new Error("User id is required");
    }

    if (!fullName || !phone || !addressLine1 || !city || !state || !country || !pincode) {
      throw new Error(
        "fullName, phone, addressLine1, city, state, country and pincode are required"
      );
    }

    const created = await Address.create({
      user_id: normalizedUserId,
      fullName: normalizeString(fullName),
      phone: normalizeString(phone),
      addressLine1: normalizeString(addressLine1),
      addressLine2: normalizeString(addressLine2),
      landmark: normalizeString(landmark),
      city: normalizeString(city),
      state: normalizeString(state),
      country: normalizeString(country),
      pincode: normalizeString(pincode),
      isDefault: Boolean(isDefault),
    });

    if (created.isDefault) {
      await setDefaultAddress(normalizedUserId, created.address_id);
    }

    return mapAddress(created);
  },

  updateAddress: async ({
    user_id,
    address_id,
    fullName,
    phone,
    addressLine1,
    addressLine2,
    landmark,
    city,
    state,
    country,
    pincode,
    isDefault,
  }) => {
    const normalizedUserId = normalizeId(user_id);
    const normalizedAddressId = normalizeId(address_id);

    if (!normalizedUserId) {
      throw new Error("user_id is required");
    }

    if (!normalizedAddressId) {
      throw new Error("address_id is required");
    }

    const address = await Address.findOne({
      user_id: normalizedUserId,
      address_id: normalizedAddressId,
    }).exec();

    if (!address) {
      throw new Error("Address not found");
    }

    if (!fullName || !phone || !addressLine1 || !city || !state || !country || !pincode) {
      throw new Error(
        "fullName, phone, addressLine1, city, state, country and pincode are required"
      );
    }

    address.fullName = normalizeString(fullName);
    address.phone = normalizeString(phone);
    address.addressLine1 = normalizeString(addressLine1);
    address.addressLine2 = normalizeString(addressLine2);
    address.landmark = normalizeString(landmark);
    address.city = normalizeString(city);
    address.state = normalizeString(state);
    address.country = normalizeString(country);
    address.pincode = normalizeString(pincode);
    address.isDefault = Boolean(isDefault);

    await address.save();

    if (address.isDefault) {
      await setDefaultAddress(normalizedUserId, normalizedAddressId);
    }

    return mapAddress(address);
  },

  deleteAddress: async ({ user_id, address_id }) => {
    const normalizedUserId = normalizeId(user_id);
    const normalizedAddressId = normalizeId(address_id);

    if (!normalizedUserId) {
      throw new Error("user_id is required");
    }

    if (!normalizedAddressId) {
      throw new Error("address_id is required");
    }

    const deleted = await Address.findOneAndDelete({
      user_id: normalizedUserId,
      address_id: normalizedAddressId,
    }).exec();

    if (!deleted) {
      throw new Error("Address not found");
    }

    // If default address is deleted, assign newest address as default.
    if (deleted.isDefault) {
      const nextDefault = await Address.findOne({ user_id: normalizedUserId })
        .sort({ createdAt: -1 })
        .exec();
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }

    return {
      address_id: normalizedAddressId,
    };
  },

  listAddresses: async ({ user_id }) => {
    const normalizedUserId = normalizeId(user_id);
    if (!normalizedUserId) {
      throw new Error("user_id is required");
    }

    const addresses = await Address.find({ user_id: normalizedUserId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean()
      .exec();

    return addresses.map(mapAddress);
  },
};

export default AddressService;
