import Category from "../models/category.model.js";
import SubCategory from "../models/sub-category.model.js";

const normalizeName = (value) => String(value).trim();

export const CategoryService = {
  createCategory: async ({ name, description, category_image }) => {
    if (!name) {
      throw new Error("Category name is required");
    }

    const normalizedName = normalizeName(name);
    const existingCategory = await Category.findOne({ name: normalizedName }).exec();

    if (existingCategory) {
      throw new Error("Category already exists");
    }

    const category = await Category.create({
      name: normalizedName,
      description: description ? String(description).trim() : "",
      category_image: category_image ? String(category_image).trim() : "",
    });

    return {
      category_id: category.category_id,
      name: category.name,
      description: category.description,
      category_image: category.category_image,
    };
  },

  getCategories: async ({ page = 1, limit = 100, name } = {}) => {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 100));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};
    if (name && String(name).trim()) {
      filter.name = new RegExp(String(name).trim(), "i");
    }

    const [categories, total] = await Promise.all([
      Category.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select("category_id name description category_image -_id")
        .lean()
        .exec(),
      Category.countDocuments(filter),
    ]);

    return {
      categories,
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

  getCategoryById: async ({ category_id }) => {
    if (!category_id) {
      throw new Error("category_id is required");
    }

    const category = await Category.findOne({ category_id: String(category_id).trim() })
      .select("category_id name description category_image -_id")
      .lean()
      .exec();

    if (!category) {
      throw new Error("Category not found");
    }

    return category;
  },

  updateCategory: async ({ category_id, name, description, category_image }) => {
    if (!category_id) {
      throw new Error("category_id is required");
    }

    if (!name && description === undefined && category_image === undefined) {
      throw new Error("At least one of name, description, or category_image is required");
    }

    const category = await Category.findOne({ category_id: String(category_id).trim() }).exec();

    if (!category) {
      throw new Error("Category not found");
    }

    if (name) {
      const normalizedName = normalizeName(name);
      const duplicate = await Category.findOne({
        name: normalizedName,
        category_id: { $ne: String(category_id).trim() },
      }).exec();

      if (duplicate) {
        throw new Error("Category name already exists");
      }

      category.name = normalizedName;
    }

    if (description !== undefined) {
      category.description = String(description).trim();
    }

    if (category_image !== undefined) {
      category.category_image = String(category_image).trim();
    }

    await category.save();

    return {
      category_id: category.category_id,
      name: category.name,
      description: category.description,
      category_image: category.category_image,
    };
  },

  deleteCategory: async ({ category_id }) => {
    if (!category_id) {
      throw new Error("category_id is required");
    }

    const normalizedCategoryId = String(category_id).trim();
    const category = await Category.findOne({ category_id: normalizedCategoryId }).exec();

    if (!category) {
      throw new Error("Category not found");
    }

    await Promise.all([
      Category.deleteOne({ category_id: normalizedCategoryId }),
      SubCategory.deleteMany({ category_id: normalizedCategoryId }),
    ]);

    return {
      category_id: normalizedCategoryId,
    };
  },
};

export default CategoryService;

