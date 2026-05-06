import express from "express"
import db from "./db.js"
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
    res.render("index", { message: req.session.message })
    req.session.message = null
})

app.get("/register", (req, res) => {
    res.render("register", { message: "", formData: {} })
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
        res.redirect("/login")
    } catch(err) {
        let errorMessage = "Database error"
        if (err.code === 'ER_DUP_ENTRY') {
            errorMessage = "Enter another email."
        }
        res.render("/register", { message: errorMessage, formData: req.body })
    }
})

app.get("/login", (req, res) => {
    if (req.session.isAuthenticated) {
        return res.redirect("/auth")
    }
    const message = req.session.message
    req.session.message = null
    res.render("login", { message })
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
            return res.redirect("/auth")
        } else {
            req.session.message = "Invalid email or password"
            return res.redirect("/login")
        }
      } else {
        req.session.message = "Invalid email or password"
        return res.redirect("/login")
      }
    } catch(err) {
        res.status(500).send("Error")
    }
})

function requireAuth(req, res, next) {
    if (req.session.isAuthenticated) {
        return next()
    }
    res.redirect("/login")
}

app.get("/auth", requireAuth, async (req, res) => {
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
    console.log(`Server is running on port ${port}.`)
})