const asyncHandler = require("../utils/asyncHandler");
const { BadRequestError, NotFoundError } = require("../utils/error");
const { config } = require("../config");
const userService = require('../services/userService');

const cookieBase = () => ({
     httpOnly: true,
     secure: config.NODE_ENV === 'production',
     sameSite: 'strict',
});

const cleanName = (value, label) => {
     if (typeof value !== 'string') {
          throw new BadRequestError(`${label} must be a string`);
     }
     const trimmed = value.trim();
     if (trimmed.length < 1 || trimmed.length > 50) {
          throw new BadRequestError(`${label} must be between 1 and 50 characters`);
     }
     return trimmed;
};

exports.getProfile = asyncHandler(async (req, res) => {
     return res.status(200).json({
          success: true,
          message: "Fetched user details",
          data: { user: req.user },
     });
});

exports.updateProfile = asyncHandler(async (req, res) => {
     const { firstName, lastName } = req.body;

     if (firstName === undefined && lastName === undefined) {
          throw new BadRequestError("Provide firstName or lastName to update");
     }

     const changes = {};
     if (firstName !== undefined) changes.firstname = cleanName(firstName, "firstName");
     if (lastName !== undefined) changes.lastname = cleanName(lastName, "lastName");

     const user = await userService.updateProfile(req.user.id, changes);

     return res.status(200).json({
          success: true,
          message: "Profile updated",
          data: { user },
     });
});

exports.deleteProfile = asyncHandler(async (req, res) => {
     const { password } = req.body || {};

     await userService.deleteProfile(req.user.id, password);

     res.clearCookie('accessToken', cookieBase());
     res.clearCookie('refreshToken', cookieBase());

     return res.status(200).json({
          success: true,
          message: "Account deleted",
     });
});

exports.getUserInternal = asyncHandler(async (req, res) => {
     const { userId } = req.params;
     if (!userId) {
          throw new BadRequestError("User Id is missing");
     }

     const user = await userService.getProfile(userId);
     if (!user) {
          throw new NotFoundError("User not found");
     }

     return res.status(200).json({
          success: true,
          data: {
               id: user.id,
               firstName: user.firstname,
               lastName: user.lastname,
               email: user.email,
          },
     });
});