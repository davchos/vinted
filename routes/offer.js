const express = require("express");
const router = express.Router();
const Offer = require("../models/Offer");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;

const isAuthenticated = require("../middlewares/isAuthenticated");

const isUserOffer = require("../middlewares/isUserOffer");

//route /offer/publish

router.post("/offer/publish", isAuthenticated, async (req, res) => {
  const product_name = req.fields.title;
  const product_description = req.fields.description;
  const product_price = req.fields.price;
  const product_details = [
    { MARQUE: req.fields.brand },
    { TAILLE: req.fields.size },
    { ETAT: req.fields.condition },
    { EMPLACEMENT: req.fields.city },
    { COLOR: req.fields.color },
  ];
  const product_image = {};
  if (
    product_description.length > 500 ||
    product_name.length > 50 ||
    product_price > 100000
  ) {
    res.status(400).json({
      message:
        "description shoud be < 500 characters, title < 50 characters and price < 100000",
    });
  } else {
    try {
      const newOffer = new Offer({
        product_name: product_name,
        product_description: product_description,
        product_price: product_price,
        product_details: product_details,
        owner: req.user,
      });

      const tmp = await newOffer.save();
      // Upload picture
      const fileKeys = Object.keys(req.files);

      if (!fileKeys.length) {
        console.log("without files");
        await tmp.save();
        res.status(200).json({
          id: tmp._id,
          product_name: product_name,
          product_description: product_description,
          product_price: product_price,
          product_details: product_details,
          owner: {
            account: req.user.account,
            _id: req.user._id,
          },
        });
      } else {
        fileKeys.forEach(async (fileKey) => {
          console.log("with files");
          const resultUpload = await cloudinary.uploader.upload(
            req.files[fileKey].path,
            {
              folder: `/vinted/offer/${tmp._id}`,
            }
          );
          product_image[fileKey] = resultUpload.secure_url;

          if (Object.keys(product_image).length === fileKeys.length) {
            // tous les uploads sont terminés, on peut donc envoyer la réponse au client
            tmp.product_image = product_image;
            await tmp.save();

            return res.status(200).json({
              id: tmp._id,
              product_name: product_name,
              product_description: product_description,
              product_price: product_price,
              product_details: product_details,
              owner: req.user,
              product_image: tmp.product_image,
            });
          }
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  }
});

router.delete(
  "/offer/delete",
  isAuthenticated,
  isUserOffer,
  async (req, res) => {
    try {
      if (req.offer) {
        const fileKeys = Object.keys(req.offer.product_image);

        if (fileKeys.length) {
          for (let i = 0; i < fileKeys.length; i++) {
            const publicId =
              `vinted/offer/${req.offer._id}/` +
              req.offer.product_image[fileKeys[i]]
                .split(`${req.offer._id}/`)[1]
                .split(".")[0];

            await cloudinary.uploader.destroy(
              publicId,
              function (result, error) {
                if (result) {
                  console.log(result);
                } else {
                  console.log(error);
                }
              }
            );
          }
          await cloudinary.api.delete_folder(
            `/vinted/offer/${req.offer._id}`,
            (result, error) => {
              if (result) {
                console.log(result);
              } else {
                console.log(error);
              }
            }
          );
        }

        await req.offer.delete();
        res.status(200).json({
          message: `Offer id ${req.fields.id} was deleted`,
        });
      }
    } catch (error) {
      res.status(400).json({
        message: `Something went wrong`,
      });
    }
  }
);

router.put("/offer/update", isAuthenticated, isUserOffer, async (req, res) => {
  const product_name = req.fields.title;
  const product_description = req.fields.description;
  const product_price = req.fields.price;
  const product_details = [
    { MARQUE: req.fields.brand },
    { TAILLE: req.fields.size },
    { ETAT: req.fields.condition },
    { EMPLACEMENT: req.fields.city },
    { COLOR: req.fields.color },
  ];
  const product_image = {};
  if (
    product_description.length > 500 ||
    product_name.length > 50 ||
    product_price > 100000
  ) {
    res.status(400).json({
      message:
        "description shoud be < 500 characters, title < 50 characters and price < 100000",
    });
  } else {
    try {
      req.offer.roduct_name = product_name;
      req.offer.product_description = product_description;
      req.offer.product_price = product_price;
      req.offer.product_details = product_details;
      req.offer.owner = req.user;

      const fileKeysToUpload = Object.keys(req.files);
      if (fileKeysToUpload.length) {
        const fileKeys = Object.keys(req.offer.product_image);
        for (let i = 0; i < fileKeys.length; i++) {
          const publicId =
            `vinted/offer/${req.offer._id}/` +
            req.offer.product_image[fileKeys[i]]
              .split(`${req.offer._id}/`)[1]
              .split(".")[0];

          await cloudinary.uploader.destroy(publicId, function (result, error) {
            if (result) {
              console.log(result);
            } else {
              console.log(error);
            }
          });
        }

        for (let j = 0; j < fileKeysToUpload.length; j++) {
          console.log("with files");
          const resultUpload = await cloudinary.uploader.upload(
            req.files[fileKeysToUpload[j]].path,
            {
              folder: `/vinted/offer/${req.offer._id}`,
            }
          );
          product_image[fileKeysToUpload[j]] = resultUpload.secure_url;
        }
        req.offer.product_image = product_image;
      }
      await req.offer.save();
      res.status(201).json({
        message: `Offer ID ${req.offer._id} was updated`,
      });
    } catch (error) {
      res.status(400).json({
        message: `Something went wrong ${error}`,
      });
    }
  }
});

router.get("/offers", async (req, res) => {
  const { title, priceMin, priceMax } = req.query;
  const offrePerPage = 5;

  const page = req.query.page ? req.query.page - 1 : 0;

  const sort = req.query.sort ? req.query.sort.replace("price-", "") : "desc";

  let query = {};
  // a revoir
  if (title) {
    query.product_name = new RegExp(title, "i");
  }
  if (priceMin) {
    query.product_price = { $gte: Number(priceMin) };
  }

  // rajouter une key a query
  if (query["product_price"]) {
    query.product_price.$lte = Number(priceMax);
  } else {
    query.product_price = { $lte: Number(priceMax) };
  }

  try {
    let result = await Offer.find(query)
      .sort({
        product_price: sort,
      })
      .populate("owner", "account")
      .skip(page * offrePerPage)
      .limit(offrePerPage);

    let count = await Offer.find(query)
      .sort({
        product_price: sort,
      })
      .populate("owner", "account")
      .countDocuments();

    console.log(result);
    return res.status(200).json({
      count: count,
      offers: result,
    });
  } catch (error) {
    console.log(error);
  } // limiter les pages
});

router.get("/offer/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const offer = await Offer.findById(id).populate("owner", "account");

    // populate({
    //path: "owner",
    //select: "account",
    //})

    if (offer) {
      res.status(200).json(offer);
    } else {
      res.status(400).json({
        message: "Offer not found",
      });
    }
  } catch (error) {
    cponsole.Log(error);
    res.status(400).json({
      message: "Offer not found",
    });
  }
});

module.exports = router;
