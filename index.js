require("dotenv").config();

const express = require("express");

const formidable = require("express-formidable");

const cors = require("cors");

const mongoose = require("mongoose");

const app = express();

app.use(formidable());

app.use(cors());

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// connection Mongodb

const firstConnection = async () => {
  try {
    mongoose.connection
      .on("error", (err) => {
        console.error("listen on error:" + err);
      })
      .on("open", (err) => {
        dbStatus = "connected";
        console.log(`DB connected`);
      })
      .on("disconnected", (err) => {
        dbStatus = "disconnected";
        console.log(`DB disconnected`);
      });
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      //createIndexes: true,
    });
  } catch (error) {
    console.error("Error in starting the connection" + error);
  }
};
firstConnection();

// routes
const userRoutes = require("./routes/user");
const offerRoutes = require("./routes/offer");
app.use(userRoutes);
app.use(offerRoutes);

// All routes

app.all("*", (req, res) => {
  res.status(404).json({
    message: "Page not found",
  });
});

//App listen

app.listen(process.env.PORT, () => {
  console.log("server started");
});
