const Offer = require("../models/Offer");
const isUserOffer = async (req, res, next) => {
  try {
    const offerLookup = await Offer.findById(req.fields.id);
    console.log(req.fields.id);
    if (offerLookup) {
      console.log("isUserOffer ");
      if (String(offerLookup.owner) === String(req.user._id)) {
        req.offer = offerLookup;
        console.log("isUserOffer 1");
        next();
      } else {
        res.status(400).json({
          message: "Unautorized",
        });
      }
    } else {
      res.status(400).json({
        message: "Unauthorized",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: "Something went wrong",
    });
  }
};

module.exports = isUserOffer;
