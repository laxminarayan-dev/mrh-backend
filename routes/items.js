const express = require("express");
const router = express.Router();
const { Item } = require("../models/ItemModel");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { getIO } = require('../connections/socket');
const { Shop } = require("../models/ShopModel");

const uploadsDir = path.join(__dirname, "..", "uploads", "images");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "");
        const baseName = path.basename(file.originalname || "image", ext);
        const safeBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");
        cb(null, `${Date.now()}_${safeBaseName}${ext}`);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith("image/")) {
            return cb(null, true);
        }
        cb(new Error("Only image files are allowed"));
    },
});


// GET /api/items - Fetch all items
router.get("/", async (req, res) => {
    try {
        const items = await Item.find();
        res.send(items);
    } catch (error) {
        res.status(500).send({ message: "Failed to fetch items" });
    }
})

// GET /api/items/:id - Fetch a single item by ID
router.get("/:id", async (req, res) => {
    try {
        const itemId = req.params.id;
        const item = await Item.findById(itemId);
        if (!item) {
            return res.status(404).send({ message: "Item not found" });
        }
        res.send(item);
    } catch (error) {
        res.status(500).send({ message: "Failed to fetch item" });
    }
})


// POST /api/items/add - Add a new item (with image upload)
router.post("/add", upload.single("image"), async (req, res) => {
    console.log("Received item data:", req.body);

    try {

        if (!req.file) {
            return res.status(400).send({ message: "Image is required" });
        }

        // ✅ FIX: Parse JSON fields
        const parseJSONFields = ["includes", "timings", "days"];

        parseJSONFields.forEach(field => {
            if (req.body[field]) {
                try {
                    req.body[field] = JSON.parse(req.body[field]);
                } catch {
                    req.body[field] = [];
                }
            }
        });

        const newItem = new Item({
            ...req.body,
            images: {
                url: `/uploads/images/${req.file.filename}`,
                alt: req.body?.imageAlt || "",
            },
        });

        const savedItem = await newItem.save();

        const io = getIO();
        if (io) io.emit("item-updated", savedItem);

        res.status(201).send({ message: "Item added", item: savedItem });

    } catch (error) {
        console.error("Error adding item:", error);
        res.status(500).send({ message: "Failed to add item" });
    }
});


// PUT /api/items/update/:id - Update an existing item (with optional image upload)
router.put("/update/:id", upload.single("image"), async (req, res) => {
    try {

        const itemId = req.params.id;

        // ✅ FIX: Parse JSON fields
        const parseJSONFields = ["includes", "timings", "days"];

        parseJSONFields.forEach(field => {
            if (req.body[field]) {
                try {
                    req.body[field] = JSON.parse(req.body[field]);
                } catch {
                    req.body[field] = [];
                }
            }
        });

        const updateData = { ...req.body };

        if (req.file) {
            updateData.images = {
                url: `/uploads/images/${req.file.filename}`,
                alt: req.body?.imageAlt || "",
            };
        }

        const updatedItem = await Item.findByIdAndUpdate(
            itemId,
            updateData,
            { new: true }
        );

        if (!updatedItem) {
            return res.status(404).send({ message: "Item not found" });
        }

        const io = getIO();
        if (io) io.emit("item-updated", updatedItem);

        res.send({ message: "Item updated", item: updatedItem });

    } catch (error) {
        console.error("Error updating item:", error);
        res.status(500).send({ message: "Failed to update item" });
    }
});

// DELETE /api/items/delete/:id - Delete an item
router.delete("/delete/:id", async (req, res) => {
    try {
        const itemId = req.params.id;
        const deletedItem = await Item.findByIdAndDelete(itemId);
        if (!deletedItem) {
            return res.status(404).send({ message: "Item not found" });
        }
        await Shop.updateMany(
            { menuItems: deletedItem._id },
            { $pull: { menuItems: deletedItem._id } }
        );
        const io = getIO()
        if (io) {
            io.emit("item-deleted");
        }
        res.send({ message: "Item deleted", item: deletedItem });
    } catch (error) {
        console.error("Error deleting item:", error);
        res.status(500).send({ message: "Failed to delete item" });
    }
})

module.exports = router;
