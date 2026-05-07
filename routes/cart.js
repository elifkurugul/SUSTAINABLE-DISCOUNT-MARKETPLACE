import express from "express"
const router = express.Router()
import db from "../db.js"
import { requireAuth } from "../server.js"

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
        cartItems.forEach( i => {
            totalPrice += (i.discounted_price * i.quantity)
        })

        res.render("shopping-cart", { items: cartItems, totalPrice, user: req.session.user })
    } catch(err) {
        res.status(500).send("Error loading shopping cart.")
    }
})

async function getCartTotal (userId) {
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

        const newTotal = await getCartTotal(req.session.user.id)

        res.json({ success: true, total: newTotal.toFixed(2) })
    } catch(err) {
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
    } catch(err) {
        res.status(500).json({ success: false })
    }
})

// purchase items
router.post("/purchase", requireAuth, async (req, res) => {
    const userId = req.session.user.id
    try {
        const [items] = await db.query(`
            SELECT product_id
            FROM shopping_cart
            WHERE consumer_id = ?
        `, [userId])
        const idsToDelete = items.map(i => i.product_id)

        if (idsToDelete.length > 0) {
            // remove products from the table (system)
            await db.query(`
                DELETE FROM products
                WHERE id IN (?)
            `, [idsToDelete])

            // clear the cart
            await db.query(`
                DELETE FROM shopping_cart
                WHERE consumer_id = ?
            `, [userId])
        }
        res.json({ success: true })
    } catch(err) {
        res.status(500).json({ success: false })
    }
})

export default router