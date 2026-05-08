import express from "express"
const router = express.Router()
import db from "../db.js"
import { requireAuth } from "../server.js"

// add to cart
router.post("/add", async (req, res) => {
    if (!req.session.isAuthenticated || !req.session.user || req.session.user.type !== "consumer") {
        return res.status(401).json({ success: false, message: "Please log in as a consumer to add items." });
    }
    const consumerId = req.session.user.id;
    const productId = req.body.productId;
    const quantity = parseInt(req.body.quantity) || 1;

    try {
        // check if the product is already in this consumer's shopping cart
        const [existingItem] = await db.query(
            "SELECT * FROM shopping_cart WHERE consumer_id = ? AND product_id = ?",
            [consumerId, productId]
        )

        if (existingItem.length > 0) {
            // if it exists, UPDATE the quantity
            await db.query(
                "UPDATE shopping_cart SET quantity = quantity + ? WHERE consumer_id = ? AND product_id = ?",
                [quantity, consumerId, productId]
            )
        } else {
            // if it does not exist, INSERT a new row
            await db.query(
                "INSERT INTO shopping_cart (consumer_id, product_id, quantity) VALUES (?, ?, ?)",
                [consumerId, productId, quantity]
            )
        }
        res.status(200).json({ success: true, message: "Successfully added to your cart!" })

    } catch (err) {
        console.error("Error adding to cart:", err);
        res.status(500).json({ success: false, message: "Database error while adding to cart." })
    }
});

router.get("/", requireAuth, async (req, res) => {
    const userId = req.session.user.id

    try {
        const [cartItems] = await db.query(`
            SELECT sc.id, p.title, p.discounted_price, sc.quantity, p.image
            FROM shopping_cart sc
            JOIN products p ON sc.product_id = p.id
            WHERE sc.consumer_id = ?
        `, [userId])

        let totalPrice = 0
        cartItems.forEach(i => {
            totalPrice += (i.discounted_price * i.quantity)
        })

        res.render("shopping-cart", { items: cartItems, totalPrice, user: req.session.user,
            returnTo: req.session.returnTo || "/search"
        })
    } catch (err) {
        res.status(500).send("Error loading shopping cart.")
    }
})

async function getCartTotal(userId) {
    const [result] = await db.query(`
        SELECT SUM(p.discounted_price * c.quantity) AS total
        FROM shopping_cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.consumer_id = ?
    `, [userId])
    return result[0].total || 0
}

// update quantity
router.patch("/update", requireAuth, async (req, res) => {
    const { cartId, newQuantity } = req.body

    try {
        await db.query(`
            UPDATE shopping_cart
            SET quantity = ?
            WHERE id = ?
        `, [newQuantity, cartId])

        let newTotal = await getCartTotal(req.session.user.id)

        newTotal = parseFloat(newTotal) || 0
        res.json({ success: true, total: newTotal.toFixed(2) })
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false })
    }
})

// remove item
router.delete("/remove/:id", requireAuth, async (req, res) => {
    try {
        await db.query(`
            DELETE FROM shopping_cart
            WHERE id = ?
        `, [req.params.id])

        const newTotal = await getCartTotal(req.session.user.id)

        res.json({ success: true, total: newTotal.toFixed(2) })
    } catch (err) {
        res.status(500).json({ success: false })
    }
})

// purchase items
router.post("/purchase", requireAuth, async (req, res) => {
    const userId = req.session.user.id
    try {
        const [cartItems] = await db.query(`
            SELECT product_id, quantity
            FROM shopping_cart
            WHERE consumer_id = ?
        `, [userId])

        if (cartItems.length > 0) {
            for (let item of cartItems) {
                await db.query(`
                    UPDATE products 
                    SET stock = stock - ? 
                    WHERE id = ?
                `, [item.quantity, item.product_id]);

                await db.query(`
                    DELETE FROM products 
                    WHERE id = ? AND stock <= 0
                `, [item.product_id]);
            }
        }
        // clear shopping cart
        await db.query(`
            DELETE FROM shopping_cart
            WHERE consumer_id = ?
        `, [userId]);

        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ success: false })
    }
})

export default router