const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    review: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // Reactions / Likes
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Optional: track who liked (to prevent multiple likes)
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Optional reference (if review is for an item)
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },
  },
  {
    timestamps: true, // createdAt = review date
  }
);

const Review = mongoose.model("Review", reviewSchema, "reviews");

module.exports = Review;
