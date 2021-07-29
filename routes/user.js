const express = require("express");

const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

const router = express.Router();

const User = require("../models/User");
const Offer = require("../models/Offer");

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.post("/user/signup", async (req, res) => {
  const username = req.fields.username;
  const password = req.fields.password;
  const email = req.fields.email;
  const phone = req.fields.phone;
  //const image_user = req.files && !Array.isArray(req.files) ? req.files : null;

  try {
    if (await User.findOne({ email: email })) {
      res.status(400).json({
        message: `user ${req.email} already exist `,
      });
    } else if (!username) {
      res.status(400).json({
        message: `username is required `,
      });
    } else {
      const salt = uid2(16);
      const hash = SHA256(password + salt).toString(encBase64);
      const token = uid2(16);
      const newUser = new User({
        email: email,
        account: {
          username: username,
          phone: phone,
          //avatar: Object, // nous verrons plus tard comment uploader une image
        },
        token: token,
        hash: hash,
        salt: salt,
      });
      let resultat = await newUser.save();
      console.log(typeof req.files);
      if (req.files.length > 0) {
        console.log(req.files);
        //console.log(req.files.picture.path);
        const resultUpload = await cloudinary.uploader.upload(
          req.files.picture.path,
          {
            folder: `/vinted/user/${resultat._id}`,
          }
        );
        //console.log(resultUpload.secure_url);
        resultat.account.avatar = resultUpload.secure_url;
      }

      resultat = await newUser.save();
      //console.group(resultat);
      // ToDo add the right field in the response
      res.status(200).json({
        _id: resultat._id,
        token: resultat.token,
        account: resultat.account,
      });
    }
  } catch (error) {
    console.log(error);
  }
});

router.post("/user/login", async (req, res) => {
  const email = req.fields.email;
  const password = req.fields.password;
  const loginUser = await User.findOne({ email: email });
  if (loginUser) {
    if (
      SHA256(password + loginUser.salt).toString(encBase64) === loginUser.hash
    ) {
      res.status(200).json({
        _id: loginUser._id,
        token: loginUser.token,
        account: loginUser.account,
      });
    } else {
      res.status(400).json({
        message: "Unauthorized",
      });
    }
  } else {
    res.status(400).json({
      message: "UNauthorized",
    });
  }
});

module.exports = router;
