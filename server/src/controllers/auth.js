const { comparePassword } = require("../helpers/bcryptPassword");
const createError = require("http-errors");
const jwt = require("jsonwebtoken");
const User = require("../models/users");
const dev = require("../config");
const { sendResponse } = require("../helpers/responseHandler");

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      throw createError(404, "Email or password is missing");
    if (password.length < 6)
      throw createError(404, "Minimum length for password is 6 characters");

    const user = await User.findOne({ email: email });
    if (!user)
      throw createError(
        400,
        "User with this email does not exist, please register first"
      );
    const isPasswordMatch = await comparePassword(password, user.password);
    if (!isPasswordMatch)
      throw createError(400, "Email/password does not match");
    if (user.isBanned)
      throw createError(400, "This account is banned, please contact an admin");

    //creating a access token
    const accessToken = jwt.sign(
      {
        password,
        email,
      },
      dev.app.jwtAuthorisationKey,
      {
        expiresIn: "10m",
      }
    );

    const refreshToken = jwt.sign(
      {
        email,
      },
      dev.app.jwtRefreshKey,
      { expiresIn: "1d" }
    );

    // Send token to client
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      secure: false,
      sameSite: "none",
    });
    sendResponse(res, 200, "Login successful", {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        accessToken: accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};
const logoutUser = (req, res, next) => {
  try {
    res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: false });
    sendResponse(res, 200, "Logout successful");
  } catch (error) {
    next(error);
  }
};
const refreshToken = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (req.cookies?.jwt) {
      // Destructuring refreshToken from cookie
      const refreshToken = req.cookies.jwt;

      // Verifying refresh token
      jwt.verify(refreshToken, dev.app.jwtRefreshKey, (err, decoded) => {
        if (err) throw createError(406, "Unauthorized");
        else {
          // Correct token we send a new access token
          const accessToken = jwt.sign(
            {
              email,
              password,
            },
            dev.app.jwtAuthorisationKey,
            {
              expiresIn: "10m",
            }
          );
          return res.json({ accessToken });
        }
      });
    }
  } catch (error) {
    next(error);
  }
};
const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      throw createError(404, "Email or password is missing");
    if (password.length < 6)
      throw createError(404, "Minimum length for password is 6 characters");

    const user = await User.findOne({ email: email });
    if (!user)
      throw createError(
        400,
        "User with this email does not exist, please register first"
      );
    if (user.is_admin === 0) throw createError(401, "user is not an admin");
    const isPasswordMatch = await comparePassword(password, user.password);
    if (!isPasswordMatch)
      throw createError(400, "Email/password does not match");

    const accessToken = jwt.sign(
      {
        password,
        email,
      },
      dev.app.jwtAuthorisationKey,
      {
        expiresIn: "10m",
      }
    );

    const refreshToken = jwt.sign(
      {
        email,
      },
      dev.app.jwtRefreshKey,
      { expiresIn: "1d" }
    );

    // Send token to client
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      secure: false,
      sameSite: "none",
    });
    sendResponse(res, 200, "Login successful as an admin", {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        accessToken: accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};
module.exports = { loginUser, logoutUser, refreshToken, loginAdmin };
