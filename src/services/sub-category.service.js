import Category from "../models/category.model.js";
import SubCategory from "../models/sub-category.model.js";

const normalizeName = (value) => String(value).trim();

export const SubCategoryService = {
  createSubCategory: async ({ category_id, name, description, sub_category_image }) => {
    if (!category_id || !name) {
      throw new Error("category_id and sub-category name are required");
    }

    const normalizedCategoryId = String(category_id).trim();
    const normalizedName = normalizeName(name);

    const parentCategory = await Category.findOne({
      category_id: normalizedCategoryId,
    }).exec();

    if (!parentCategory) {
      throw new Error("Category not found");
    }

    const existingSubCategory = await SubCategory.findOne({
      category_id: normalizedCategoryId,
      name: normalizedName,
    }).exec();

    if (existingSubCategory) {
      throw new Error("Sub-category already exists in this category");
    }

    const subCategory = await SubCategory.create({
      category_id: normalizedCategoryId,
      name: normalizedName,
      description: description ? String(description).trim() : "",
      sub_category_image: sub_category_image ? String(sub_category_image).trim() : "",
    });

    return {
      sub_category_id: subCategory.sub_category_id,
      category_id: subCategory.category_id,
      name: subCategory.name,
      description: subCategory.description,
      sub_category_image: subCategory.sub_category_image,
    };
  },

  getSubCategories: async ({ category_id, page = 1, limit = 10 } = {}) => {
    const filter = {};

    if (category_id) {
      filter.category_id = String(category_id).trim();
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const [subCategories, total] = await Promise.all([
      SubCategory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select("sub_category_id category_id name description sub_category_image -_id")
        .lean()
        .exec(),
      SubCategory.countDocuments(filter),
    ]);

    return {
      subCategories,
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

  getSubCategoryById: async ({ sub_category_id }) => {
    if (!sub_category_id) {
      throw new Error("sub_category_id is required");
    }

    const subCategory = await SubCategory.findOne({
      sub_category_id: String(sub_category_id).trim(),
    })
      .select("sub_category_id category_id name description sub_category_image -_id")
      .lean()
      .exec();

    if (!subCategory) {
      throw new Error("Sub-category not found");
    }

    return subCategory;
  },

  updateSubCategory: async ({ sub_category_id, name, description, sub_category_image }) => {
    if (!sub_category_id) {
      throw new Error("sub_category_id is required");
    }

    if (!name && description === undefined && sub_category_image === undefined) {
      throw new Error("At least one of name, description, or sub_category_image is required");
    }

    const subCategory = await SubCategory.findOne({
      sub_category_id: String(sub_category_id).trim(),
    }).exec();

    if (!subCategory) {
      throw new Error("Sub-category not found");
    }

    if (name) {
      const normalizedName = normalizeName(name);
      const duplicate = await SubCategory.findOne({
        category_id: subCategory.category_id,
        name: normalizedName,
        sub_category_id: { $ne: String(sub_category_id).trim() },
      }).exec();

      if (duplicate) {
        throw new Error("Sub-category name already exists in this category");
      }

      subCategory.name = normalizedName;
    }

    if (description !== undefined) {
      subCategory.description = String(description).trim();
    }

    if (sub_category_image !== undefined) {
      subCategory.sub_category_image = String(sub_category_image).trim();
    }

    await subCategory.save();

    return {
      sub_category_id: subCategory.sub_category_id,
      category_id: subCategory.category_id,
      name: subCategory.name,
      description: subCategory.description,
      sub_category_image: subCategory.sub_category_image,
    };
  },

  deleteSubCategory: async ({ sub_category_id }) => {
    if (!sub_category_id) {
      throw new Error("sub_category_id is required");
    }

    const normalizedSubCategoryId = String(sub_category_id).trim();
    const subCategory = await SubCategory.findOne({
      sub_category_id: normalizedSubCategoryId,
    }).exec();

    if (!subCategory) {
      throw new Error("Sub-category not found");
    }

    await SubCategory.deleteOne({ sub_category_id: normalizedSubCategoryId });

    return {
      sub_category_id: normalizedSubCategoryId,
    };
  },
};

export default SubCategoryService;

