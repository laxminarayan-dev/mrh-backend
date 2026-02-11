const express = require("express");
const router = express.Router();
const { Item } = require("../models/ItemModel");



router.get("/", async (req, res) => {
    try {
        const items = await Item.find();
        res.send(items);
    } catch (error) {
        res.status(500).send({ message: "Failed to fetch items" });
    }
})

router.post("/add", (req, res) => {

})

router.post("/update", (req, res) => {

})

router.post("/delete", (req, res) => {

})


module.exports = router;
