const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    userLookup = await User.findOne({
      token: req.headers.authorization.replace("Bearer ", ""),
    }).select("account");
    if (userLookup) {
      req.user = userLookup;
      next();
    } else {
      res.status(400).json({
        message: " Unautorized",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: "Something went wrong",
    });
  }
};

module.exports = isAuthenticated;
