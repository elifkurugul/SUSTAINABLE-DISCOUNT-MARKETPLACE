import express from "express"
import { db } from "./db.js"
import bcrypt from "bcrypt"
import "dotenv/config"
import session from "express-session"

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

app.get("/", async (req, res) => {
    if (req.session.isAuthenticated) {
        return res.redirect("/main")
    }
    res.render("login", { message: req.session.message })
    req.session.message = null
})

app.get("/register", (req, res) => {
    res.render("register")
})

app.post("/register", async (req, res) => {
    const { email, name, password, city, district, type } = req.body
    const hashedPassword = await bcrypt.hash(password, 10)
    try {
        await db.query(
            "INSERT INTO users (email, name, password, city, district, type) VALUES (?, ?, ?, ?, ?, ?)",
            [email, name, hashedPassword, city, district, type]
        )
        req.session.message = "Registration successful. Please login."
        res.redirect("/")
    } catch(err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).send("Enter another email.");
        }
        res.status(500).send("Database error")
    }
})

app.post("/login", async (req,res)=>{
    // REMEMBER ME YAZ EJS'E
    const { email, password, remember } = req.body;
    try {
      const [rows] = await db.query("SELECT * FROM users WHERE email= ?", [email])
      if (rows.length > 0) {
        const user = rows[0]
        const match = await bcrypt.compare(password, user.password)
        if (match) {
            req.session.user = user
            req.session.isAuthenticated = true
            if (remember) {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
            }
            return res.redirect("/main")
        } else {
            req.session.message = "Invalid email or password"
            return res.redirect("/")
        }
      } else {
        req.session.message = "Invalid email or password"
        return res.redirect("/")
      }
    } catch(err) {
        res.status(500).send("Error")
    }
})

function requireAuth(req, res, next) {
    if (req.session.isAuthenticated) {
        return next()
    }
    res.redirect("/")
}

app.get("/main", requireAuth, async (req, res) => {
    const user = req.session.user

    if (user.type === "market") {
        res.render("market-page", { user })
    } else if (user.type === "consumer") {
        res.render("consumer-page", { user })
    }
})

app.get("/logout", requireAuth, (req, res) => {
    req.session.destroy()
    res.redirect("/")
})

app.listen(port, () => {
    console.log("Server is running on port 3000")
})