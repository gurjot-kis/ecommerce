export const ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  USER: "User",
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        code: 401,
        message: "Unauthorized: role missing",
        data: null,
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: "Forbidden: insufficient role",
        data: null,
      });
    }

    return next();
  };
};

export default authorizeRoles;

