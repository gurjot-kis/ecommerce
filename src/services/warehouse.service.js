import User from "../models/user.model.js";
import Warehouse from "../models/warehouse.model.js";
import WarehouseInventory from "../models/warehouse-inventory.model.js";

const GOOGLE_GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

const normalizeString = (value) =>
  value === undefined || value === null ? "" : String(value).trim();

const normalizeId = (value) => normalizeString(value).replace(/^:/, "");

const parseStatus = (value, { defaultValue = 1 } = {}) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const n = parseInt(String(value).trim(), 10);
  if (n === 0 || n === 1) {
    return n;
  }
  throw new Error("status must be 0 or 1");
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(normalized);
};

const parseOptionalLatitude = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const n = typeof value === "number" ? value : parseFloat(String(value).trim());
  if (!Number.isFinite(n) || n < -90 || n > 90) {
    throw new Error("latitude must be a number between -90 and 90");
  }
  return n;
};

const parseOptionalLongitude = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const n = typeof value === "number" ? value : parseFloat(String(value).trim());
  if (!Number.isFinite(n) || n < -180 || n > 180) {
    throw new Error("longitude must be a number between -180 and 180");
  }
  return n;
};

const parseServicePincodes = (value) => {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((p) => normalizeString(p)).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((p) => normalizeString(p)).filter(Boolean);
        }
      } catch {
        // fall through
      }
    }
    return trimmed
      .split(",")
      .map((p) => normalizeString(p))
      .filter(Boolean);
  }
  throw new Error("service_pincodes must be an array or comma-separated string");
};

const selectFields =
  "warehouse_id vendor_id name code warehouse_image full_address addressLine1 city state country pincode latitude longitude service_pincodes status is_default -_id";

const mapWarehouse = (doc) => ({
  warehouse_id: doc.warehouse_id,
  vendor_id: doc.vendor_id,
  name: doc.name,
  code: doc.code || "",
  warehouse_image: doc.warehouse_image || "",
  full_address: doc.full_address || "",
  addressLine1: doc.addressLine1 || "",
  city: doc.city || "",
  state: doc.state || "",
  country: doc.country || "",
  pincode: doc.pincode || "",
  latitude: doc.latitude != null && Number.isFinite(doc.latitude) ? doc.latitude : null,
  longitude: doc.longitude != null && Number.isFinite(doc.longitude) ? doc.longitude : null,
  service_pincodes: Array.isArray(doc.service_pincodes) ? doc.service_pincodes : [],
  status: doc.status === 0 ? 0 : 1,
  is_default: Boolean(doc.is_default),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const ensureVendorExists = async (vendor_id) => {
  const id = normalizeId(vendor_id);
  const vendor = await User.findOne({ user_id: id, role: "Vendor" })
    .select("user_id -_id")
    .lean()
    .exec();
  if (!vendor) {
    throw new Error("Vendor not found");
  }
  return id;
};

const clearOtherDefaultWarehouses = async (vendor_id, exceptWarehouseId = null) => {
  const filter = { vendor_id, is_default: true };
  if (exceptWarehouseId) {
    filter.warehouse_id = { $ne: exceptWarehouseId };
  }
  await Warehouse.updateMany(filter, { $set: { is_default: false } }).exec();
};

const hasCoordinateInPayload = (payload) =>
  ["latitude", "Latitude", "lat", "Lat", "longitude", "Longitude", "lng", "Lng"].some(
    (key) => payload[key] !== undefined && payload[key] !== null && normalizeString(payload[key]) !== ""
  );

const getExplicitCoordinatesFromPayload = (payload, fallback = { latitude: null, longitude: null }) => {
  const hasLat = payload.latitude !== undefined || payload.Latitude !== undefined || payload.lat !== undefined || payload.Lat !== undefined;
  const hasLng = payload.longitude !== undefined || payload.Longitude !== undefined || payload.lng !== undefined || payload.Lng !== undefined;

  return {
    latitude: hasLat
      ? parseOptionalLatitude(payload.latitude ?? payload.Latitude ?? payload.lat ?? payload.Lat)
      : fallback.latitude,
    longitude: hasLng
      ? parseOptionalLongitude(payload.longitude ?? payload.Longitude ?? payload.lng ?? payload.Lng)
      : fallback.longitude,
  };
};

const normalizeWarehousePayload = (payload = {}) => {
  const city = normalizeString(payload.city || payload.City);
  const state = normalizeString(payload.state || payload.State);
  const pincode = normalizeString(payload.pincode || payload.Pincode);
  const country = normalizeString(payload.country || payload.Country);

  const full_address = normalizeString(
    payload.full_address || payload.fullAddress || payload.address || payload.formatted_address
  );
  const addressLine1 = normalizeString(payload.addressLine1 || payload.address_line1 || full_address);

  return {
    vendor_id: payload.vendor_id,
    name: normalizeString(payload.name),
    code: normalizeString(payload.code),
    warehouse_image: normalizeString(payload.warehouse_image),
    full_address,
    addressLine1,
    city,
    state,
    country,
    pincode,
    latitude: parseOptionalLatitude(
      payload.latitude ?? payload.Latitude ?? payload.lat ?? payload.Lat
    ),
    longitude: parseOptionalLongitude(
      payload.longitude ?? payload.Longitude ?? payload.lng ?? payload.Lng
    ),
    service_pincodes: parseServicePincodes(payload.service_pincodes),
    status: parseStatus(payload.status),
    is_default: parseBoolean(payload.is_default, false),
  };
};

const buildAddressForGeocode = (payload) => {
  const parts = [payload.full_address, payload.addressLine1, payload.city, payload.state, payload.pincode, payload.country]
    .map((v) => normalizeString(v))
    .filter(Boolean);
  return [...new Set(parts)].join(", ");
};

const geocodeAddress = async (addressText) => {
  const apiKey = normalizeString(process.env.GOOGLE_MAPS_API_KEY);
  if (!apiKey || !addressText) {
    return null;
  }

  const url = `${GOOGLE_GEOCODE_ENDPOINT}?address=${encodeURIComponent(addressText)}&key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    const first = data?.results?.[0];
    const lat = first?.geometry?.location?.lat;
    const lng = first?.geometry?.location?.lng;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: Number(lat), longitude: Number(lng) };
    }
    return null;
  } catch {
    return null;
  }
};

const resolveCoordinates = async (normalizedPayload, { requireGeocodedWhenMissing = false } = {}) => {
  let latitude = normalizedPayload.latitude;
  let longitude = normalizedPayload.longitude;

  if (latitude !== null && longitude !== null) {
    return { latitude, longitude };
  }

  const addressText = buildAddressForGeocode(normalizedPayload);
  const geocoded = await geocodeAddress(addressText);
  if (geocoded) {
    return geocoded;
  }

  if (requireGeocodedWhenMissing) {
    throw new Error(
      "Unable to resolve latitude/longitude from address. Provide valid address fields or latitude/longitude"
    );
  }

  return {
    latitude,
    longitude,
  };
};

const hasAddressFieldInPayload = (payload) =>
  [
    "address",
    "formatted_address",
    "full_address",
    "fullAddress",
    "addressLine1",
    "address_line1",
    "city",
    "City",
    "state",
    "State",
    "country",
    "Country",
    "pincode",
    "Pincode",
  ].some((key) => payload[key] !== undefined);

export const hasWarehousePayloadFields = (payload = {}) => {
  const keys = [
    "vendor_id",
    "name",
    "code",
    "warehouse_image",
    "address",
    "formatted_address",
    "full_address",
    "fullAddress",
    "addressLine1",
    "address_line1",
    "city",
    "City",
    "state",
    "State",
    "country",
    "Country",
    "pincode",
    "Pincode",
    "latitude",
    "Latitude",
    "lat",
    "Lat",
    "longitude",
    "Longitude",
    "lng",
    "Lng",
    "service_pincodes",
    "status",
    "is_default",
  ];
  return keys.some((key) => payload[key] !== undefined && payload[key] !== null && normalizeString(payload[key]) !== "");
};

const applyWarehouseFieldsToDoc = async (doc, normalized, { vendor_id, isDefault }) => {
  doc.vendor_id = vendor_id;
  doc.name = normalized.name;
  doc.code = normalized.code;
  doc.warehouse_image = normalized.warehouse_image;
  doc.full_address = normalized.full_address;
  doc.addressLine1 = normalized.addressLine1;
  doc.city = normalized.city;
  doc.state = normalized.state;
  doc.country = normalized.country;
  doc.pincode = normalized.pincode;
  doc.latitude = normalized.latitude;
  doc.longitude = normalized.longitude;
  doc.service_pincodes = normalized.service_pincodes;
  doc.status = normalized.status;
  doc.is_default = isDefault;

  if (isDefault) {
    await clearOtherDefaultWarehouses(vendor_id, doc.warehouse_id);
  }
};

export const WarehouseService = {
  createWarehouse: async (payload) => {
    const normalized = normalizeWarehousePayload(payload);
    const vendor_id = await ensureVendorExists(normalized.vendor_id);

    if (!normalized.name) {
      throw new Error("name is required");
    }

    const duplicate = await Warehouse.findOne({ vendor_id, name: normalized.name }).exec();
    if (duplicate) {
      throw new Error("Warehouse name already exists for this vendor");
    }

    const isDefault = normalized.is_default;
    if (isDefault) {
      await clearOtherDefaultWarehouses(vendor_id);
    }

    const coords = await resolveCoordinates(normalized, { requireGeocodedWhenMissing: true });

    const doc = await Warehouse.create({
      vendor_id,
      name: normalized.name,
      code: normalized.code,
      warehouse_image: normalized.warehouse_image,
      full_address: normalized.full_address,
      addressLine1: normalized.addressLine1,
      city: normalized.city,
      state: normalized.state,
      country: normalized.country,
      pincode: normalized.pincode,
      latitude: coords.latitude,
      longitude: coords.longitude,
      service_pincodes: normalized.service_pincodes,
      status: normalized.status,
      is_default: isDefault,
    });

    return mapWarehouse(doc);
  },

  listWarehouses: async ({ vendor_id, page = 1, limit = 10, search = "", status } = {}) => {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};
    if (vendor_id) {
      filter.vendor_id = normalizeId(vendor_id);
    }
    const normalizedSearch = normalizeString(search);
    if (normalizedSearch) {
      const regex = new RegExp(normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { name: regex },
        { code: regex },
        { city: regex },
        { pincode: regex },
        { full_address: regex },
      ];
    }
    if (status !== undefined && status !== null && normalizeString(status) !== "") {
      filter.status = parseStatus(status);
    }

    const [rows, total] = await Promise.all([
      Warehouse.find(filter)
        .sort({ is_default: -1, createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select(selectFields)
        .lean()
        .exec(),
      Warehouse.countDocuments(filter),
    ]);

    return {
      items: rows.map(mapWarehouse),
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

  getWarehouseById: async ({ warehouse_id }) => {
    const id = normalizeId(warehouse_id);
    if (!id) {
      throw new Error("warehouse_id is required");
    }

    const doc = await Warehouse.findOne({ warehouse_id: id }).select(selectFields).lean().exec();
    if (!doc) {
      throw new Error("Warehouse not found");
    }

    return mapWarehouse(doc);
  },

  /** PUT — full update (same form-data fields as create) */
  updateWarehouse: async ({ warehouse_id, ...payload }) => {
    const id = normalizeId(warehouse_id);
    if (!id) {
      throw new Error("warehouse_id is required");
    }

    const doc = await Warehouse.findOne({ warehouse_id: id }).exec();
    if (!doc) {
      throw new Error("Warehouse not found");
    }

    const normalized = normalizeWarehousePayload(payload);
    const vendor_id = await ensureVendorExists(normalized.vendor_id);

    if (!normalized.name) {
      throw new Error("name is required");
    }

    const duplicate = await Warehouse.findOne({
      vendor_id,
      name: normalized.name,
      warehouse_id: { $ne: id },
    }).exec();
    if (duplicate) {
      throw new Error("Warehouse name already exists for this vendor");
    }

    if (!normalized.vendor_id) {
      throw new Error("vendor_id is required");
    }

    const isDefault = normalized.is_default;
    const coords = await resolveCoordinates(normalized, { requireGeocodedWhenMissing: true });

    await applyWarehouseFieldsToDoc(
      doc,
      {
        ...normalized,
        latitude: coords.latitude,
        longitude: coords.longitude,
        warehouse_image: payload.warehouse_image !== undefined ? normalized.warehouse_image : doc.warehouse_image,
        code: payload.code !== undefined ? normalized.code : doc.code,
        service_pincodes:
          payload.service_pincodes !== undefined
            ? normalized.service_pincodes
            : doc.service_pincodes,
      },
      { vendor_id, isDefault }
    );

    await doc.save();
    return mapWarehouse(doc);
  },

  /** PATCH — partial edit (same form-data fields; send only fields to change) */
  editWarehouse: async ({ warehouse_id, ...payload }) => {
    const id = normalizeId(warehouse_id);
    if (!id) {
      throw new Error("warehouse_id is required");
    }

    if (!hasWarehousePayloadFields(payload)) {
      throw new Error("At least one field is required to update");
    }

    const doc = await Warehouse.findOne({ warehouse_id: id }).exec();
    if (!doc) {
      throw new Error("Warehouse not found");
    }

    if (payload.vendor_id !== undefined) {
      doc.vendor_id = await ensureVendorExists(payload.vendor_id);
    }

    if (payload.name !== undefined) {
      const name = normalizeString(payload.name);
      if (!name) {
        throw new Error("name cannot be empty");
      }
      const duplicate = await Warehouse.findOne({
        vendor_id: doc.vendor_id,
        name,
        warehouse_id: { $ne: id },
      }).exec();
      if (duplicate) {
        throw new Error("Warehouse name already exists for this vendor");
      }
      doc.name = name;
    }

    if (payload.code !== undefined) doc.code = normalizeString(payload.code);
    if (payload.warehouse_image !== undefined) doc.warehouse_image = normalizeString(payload.warehouse_image);

    if (
      payload.full_address !== undefined ||
      payload.fullAddress !== undefined ||
      payload.address !== undefined ||
      payload.formatted_address !== undefined
    ) {
      const full_address = normalizeString(
        payload.full_address || payload.fullAddress || payload.address || payload.formatted_address
      );
      doc.full_address = full_address;
      if (payload.address !== undefined || payload.formatted_address !== undefined) {
        doc.addressLine1 = full_address;
      }
    }
    if (payload.addressLine1 !== undefined || payload.address_line1 !== undefined) {
      doc.addressLine1 = normalizeString(payload.addressLine1 || payload.address_line1);
    }

    if (payload.city !== undefined || payload.City !== undefined) {
      doc.city = normalizeString(payload.city || payload.City);
    }
    if (payload.state !== undefined || payload.State !== undefined) {
      doc.state = normalizeString(payload.state || payload.State);
    }
    if (payload.country !== undefined || payload.Country !== undefined) {
      doc.country = normalizeString(payload.country || payload.Country);
    }
    if (payload.pincode !== undefined || payload.Pincode !== undefined) {
      doc.pincode = normalizeString(payload.pincode || payload.Pincode);
    }

    if (payload.service_pincodes !== undefined) {
      doc.service_pincodes = parseServicePincodes(payload.service_pincodes);
    }
    if (payload.status !== undefined) doc.status = parseStatus(payload.status);

    if (payload.is_default !== undefined) {
      const isDefault = parseBoolean(payload.is_default, false);
      if (isDefault) {
        await clearOtherDefaultWarehouses(doc.vendor_id, id);
      }
      doc.is_default = isDefault;
    }

    const needsCoordinateResolution = hasCoordinateInPayload(payload) || hasAddressFieldInPayload(payload);

    if (needsCoordinateResolution) {
      const mergedForCoords = normalizeWarehousePayload({
        full_address: doc.full_address,
        addressLine1: doc.addressLine1,
        city: doc.city,
        state: doc.state,
        country: doc.country,
        pincode: doc.pincode,
        latitude: doc.latitude,
        longitude: doc.longitude,
        ...payload,
      });
      const { latitude: explicitLat, longitude: explicitLng } = getExplicitCoordinatesFromPayload(payload, {
        latitude: doc.latitude,
        longitude: doc.longitude,
      });
      const coords = await resolveCoordinates(
        {
          ...mergedForCoords,
          latitude: explicitLat,
          longitude: explicitLng,
        },
        { requireGeocodedWhenMissing: true }
      );
      doc.latitude = coords.latitude;
      doc.longitude = coords.longitude;
    }

    await doc.save();
    return mapWarehouse(doc);
  },

  deleteWarehouse: async ({ warehouse_id }) => {
    const id = normalizeId(warehouse_id);
    if (!id) {
      throw new Error("warehouse_id is required");
    }

    const doc = await Warehouse.findOne({ warehouse_id: id }).exec();
    if (!doc) {
      throw new Error("Warehouse not found");
    }

    await Promise.all([
      Warehouse.deleteOne({ warehouse_id: id }),
      WarehouseInventory.deleteMany({ warehouse_id: id }),
    ]);

    return { warehouse_id: id };
  },
};

export default WarehouseService;
