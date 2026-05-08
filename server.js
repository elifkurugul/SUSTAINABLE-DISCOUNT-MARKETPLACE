import express from "express"
import db from "./db.js"
import bcrypt from "bcrypt"
import "dotenv/config"
import session from "express-session"
import cartRouter from "./routes/cart.js"
import { sendVerificationEmail } from "./routes/mail.js"
import { body, validationResult } from "express-validator"
import multer from "multer"
import path from "path"

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/images/")
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        const name = path.basename(file.originalname, ext)
        cb(null, `${Date.now()}-${name}${ext}`)
    }
})
const upload = multer({ storage })

const port = process.env.PORT
const app = express()
app.set("view engine", "ejs")
app.use(express.static("public"))
app.use(express.urlencoded({ extended: true }))

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))

app.use(express.json())
app.use("/api/cart", cartRouter)

app.get("/", async (req, res) => {
    if (req.session.isAuthenticated) {
        return res.redirect("/main")
    }
    res.render("index", { message: req.session.message })
    req.session.message = null
})

app.get("/register", (req, res) => {
    res.render("register", { message: "", formData: {} });
});

app.post("/register", async (req, res) => {
    const { email, name, password, city, district, type } = req.body;
    if (!email || !name || !password || !city || !district || !type) {
        return res.render("register", {
            message: "Please fill all fields.",
            formData: req.body //no deletion of data
        });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        req.session.pendingUser = { email, name, hashedPassword, city, district, type };
        req.session.verificationCode = code;

        await sendVerificationEmail(email, code);
        res.redirect("/verify");

    } catch (err) {
        console.log(err);
        console.log(err.message);
        // email problem
        res.render("register", {
            message: "An error occurred while sending the email. Please try again.",
            formData: req.body
        });
    }
});

app.get("/verify", (req, res) => {
    if (!req.session.pendingUser) {
        return res.redirect("/register")
    }
    res.render("verify", { message: "" })
})

app.post("/verify",
    body("code").trim().notEmpty().withMessage("Please enter a code.")
        .isLength({ min: 6, max: 6 }).withMessage("Code must be 6 characters."),
    async (req, res) => {
        // VALIDATION TAMAMLA
        const errors = validationResult(req)
        const { code } = req.body

        if (code.toUpperCase() === req.session.verificationCode) {
            const { email, name, hashedPassword, city, district, type } = req.session.pendingUser
            try {
                await db.query(
                    "INSERT INTO users (email, name, password, city, district, type) VALUES (?, ?, ?, ?, ?, ?)",
                    [email, name, hashedPassword, city, district, type]
                )
                req.session.pendingUser = null
                req.session.verificationCode = null
                req.session.message = "Registration successful. Please login."
                res.redirect("/login")
            } catch (err) {
                let errorMessage = "Database error"
                if (err.code === "ER_DUP_ENTRY") errorMessage = "Email already in use."
                res.render("verify", { message: errorMessage })
            }
        } else {
            res.render("verify", { message: "Incorrect code. Please try again." })
        }
    })

app.get("/login", (req, res) => {
    if (req.session.isAuthenticated) {
        return res.redirect("/auth")
    }

    const message = req.session.message
    const oldEmail = req.session.oldEmail || ""
    const oldRemember = req.session.oldRemember || false

    req.session.message = null
    req.session.oldEmail = null
    req.session.oldRemember = null

    res.render("login", {
        message,
        oldEmail,
        oldRemember
    })
})

app.post("/login", async (req, res) => {
    // REMEMBER ME YAZ EJS'E
    const { email, password, remember } = req.body;

    if (!email || !password) {
        req.session.message = "Please fill in all fields.";
        req.session.oldEmail = email;
        req.session.oldRemember = remember;
        return res.redirect("/login");
    }
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE email= ?", [email])
        if (rows.length > 0) {
            const user = rows[0]
            const match = await bcrypt.compare(password, user.password)
            if (match) {
                req.session.user = user
                req.session.isAuthenticated = true
                req.session.userId = user.id;
                req.session.userType = user.type;

                if (remember) {
                    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
                }
                return res.redirect("/auth");
            } else {
                req.session.message = "Invalid email or password"
                req.session.oldEmail = email; // Sticky form için e-postayı hatırla
                return res.redirect("/login")
            }
        } else {
            req.session.message = "Invalid email or password"
            return res.redirect("/login")
        }
    } catch (err) {
        res.status(500).send("Error")
    }
})

export function requireAuth(req, res, next) {
    if (req.session.isAuthenticated) {
        return next()
    }
    res.redirect("/login")
}

app.get("/search", requireAuth, async (req, res) => {
    // req.body --> for data sent in the hidden part of a POST request
    // req.query --> an object Express creates by parsing the URL string
    // --> because of name="keyword", the browser takes what you typed and
    // sticks it to the url as ?keyword=...
    const keyword = req.query.keyword || ""
    const consumer = req.session.user

    // pagination (default to page 1)
    const page = Number(req.query.page || 1)
    const limit = 4
    const offset = (page - 1) * limit
    // offset --> (where to start) --> tells the db how many rows to jump over before it starts handling the data.
    // limit --> num of items per page

    try {
        // to get the count of search result
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total
            FROM products p
            JOIN users u ON p.market_id = u.id
            WHERE p.title LIKE ?
            AND u.city = ?
            AND p.expiration_date >= CURDATE()`,
            [`%${keyword}%`, consumer.city]
        )

        const totalItems = countResult[0].total
        const pageCount = Math.ceil(totalItems / limit)

        // the case statement: 1 --> if m.district = c.district, the product is given a score of 1
        // --> else, a score of 2 --> bc of order by, all 2's go after the 1's (priority)
        const [searchResult] = await db.query(`
            SELECT p.id, p.market_id, p.title, p.stock, p.normal_price, p.discounted_price, p.expiration_date, p.image, u.district, u.name, u.city
            FROM products p
            JOIN users u ON p.market_id = u.id
            WHERE p.title LIKE ?
            AND u.city = ?
            AND p.expiration_date >= CURDATE() 
            ORDER BY 
                CASE
                    WHEN u.district = ? 
                    THEN 1 ELSE 2
                END,
                p.title ASC 
            LIMIT ? OFFSET ?`,
            [`%${keyword}%`, consumer.city, consumer.district, limit, offset])

        res.render("consumer-page", { products: searchResult, keyword, page, user: consumer, pageCount })
    } catch (err) {
        res.status(500).send("Error performing search operation.")
    }
})

//MARKET USER D
app.get("/auth", requireAuth, async (req, res) => {
    const user = req.session.user
    if (user.type === "market") {
        try {
            const [products] = await db.query("SELECT * FROM products WHERE market_id = ?", [user.id])
            res.render("market-page", { user, products })
        } catch (err) {
            res.status(500).send("Database error while fetching products.")
        }
    } else if (user.type === "consumer") {
        res.redirect("/search")
    }
})

app.post("/market/update-profile", requireAuth, async (req, res) => {
    const { name, city, district, password } = req.body;
    const userId = req.session.user.id;
    try {
        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query(
                "UPDATE users SET name = ?, city = ?, district = ?, password = ? WHERE id = ?",
                [name, city, district, hashedPassword, userId]
            );
        } else {
            await db.query(
                "UPDATE users SET name = ?, city = ?, district = ? WHERE id = ?",
                [name, city, district, userId]
            );
        }
        req.session.user.name = name;
        req.session.user.city = city;
        req.session.user.district = district;
        res.redirect("/auth");
    } catch (err) {
        console.error(err);
        res.status(500).send("Profil güncellenirken hata oluştu.");
    }
});

app.post("/market/add-product", requireAuth, upload.single("image"), async (req, res) => {
    const { title, stock, normal_price, discounted_price, expiration_date } = req.body
    const market_id = req.session.user.id

    // validate expiration date
    const today = new Date()
    today.setHours(0, 0, 0, 0) // today is a valid expiration
    const inputDate = new Date(expiration_date)

    if (inputDate < today) {
        return res.status(400).send("Error: You cannot add a product with an expiration date in the past.")
    }

    // img upload validation
    if (!req.file) {
        return res.status(400).send("Please upload an image for the product.")
    }
    const ext = path.extname(req.file.originalname).toLowerCase()
    if (![".jpg", ".jpeg", ".png", ".gif"].includes(ext)) {
        return res.status(400).send("Invalid file type. Only JPG, JPEG, PNG, and GIF are allowed.")
    }
    const image = req.file.filename

    try {
        await db.query(
            "INSERT INTO products (market_id, title, stock, normal_price, discounted_price, expiration_date, image) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [market_id, title, stock, normal_price, discounted_price, expiration_date, image]
        );
        res.redirect("/auth")
    } catch (err) {
        res.status(500).send("Error adding product to database.")
    }
});


app.post("/market/delete-product/:id", requireAuth, async (req, res) => {
    const productId = req.params.id;
    const marketId = req.session.user.id;
    try {
        await db.query("DELETE FROM products WHERE id = ? AND market_id = ?", [productId, marketId]);
        res.redirect("/auth");
    } catch (err) {
        res.status(500).send("Error deleting product.");
    }
});

app.post("/market/edit-product/:id", requireAuth, upload.single("image"), async (req, res) => {
    const productId = req.params.id;
    const marketId = req.session.user.id;
    const { title, stock, normal_price, discounted_price, expiration_date } = req.body;

    try {
        if (req.file) {
            // user uploads new image
            const ext = path.extname(req.file.originalname).toLowerCase();
            if (![".jpg", ".jpeg", ".png", ".gif"].includes(ext)) {
                return res.status(400).send("Invalid file type. Only JPG, JPEG, PNG, and GIF are allowed.")
            }
            const newImage = req.file.filename;
            await db.query(
                "UPDATE products SET title = ?, stock = ?, normal_price = ?, discounted_price = ?, expiration_date = ?, image = ? WHERE id = ? AND market_id = ?",
                [title, stock, normal_price, discounted_price, expiration_date, newImage, productId, marketId]
            )
        } else {
            // no new image
            await db.query(
                "UPDATE products SET title = ?, stock = ?, normal_price = ?, discounted_price = ?, expiration_date = ? WHERE id = ? AND market_id = ?",
                [title, stock, normal_price, discounted_price, expiration_date, productId, marketId]
            )
        }
        res.redirect("/auth")
    } catch (err) {
        res.status(500).send("Error updating product.")
    }
})

app.post("/consumer/update-profile", requireAuth, async (req, res) => {
    const { name, city, district, password } = req.body;
    const userId = req.session.user.id;

    try {
        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query(
                "UPDATE users SET name = ?, city = ?, district = ?, password = ? WHERE id = ?",
                [name, city, district, hashedPassword, userId]
            );
        } else {
            await db.query(
                "UPDATE users SET name = ?, city = ?, district = ? WHERE id = ?",
                [name, city, district, userId]
            );
        }

        req.session.user.name = name;
        req.session.user.city = city;
        req.session.user.district = district;
        req.session.message = "Profile updated successfully."
        res.redirect("/profile");
    } catch (err) {
        console.error(err);
        res.status(500).send("Some error happened updating profile")
    }
})

app.get("/logout", requireAuth, (req, res) => {
    req.session.destroy()
    res.redirect("/")
})

app.get("/profile", async (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }
    try {
        const userId = req.session.userId;
        const userType = req.session.userType;

        const [rows] = await db.query(`SELECT * FROM users WHERE id=? AND type= ?`,
            [userId, userType]);

        if (rows.length === 0) {
            return res.redirect('/login');
        }
        const userData = rows[0];

        if (userData.type === "market") {

            const [products] = await db.query(
                "SELECT * FROM products WHERE market_id = ?",
                [userId]
            );

            return res.render("market-profile", {
                market: userData,
                products: products
            });

        } else {
            return res.render("consumer-profile", {
                consumer: userData
            });
        }

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }

})

app.listen(port, () => {
    console.log(`Server is running on port ${port}.`)
})