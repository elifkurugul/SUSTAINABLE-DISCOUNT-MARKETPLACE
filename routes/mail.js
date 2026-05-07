const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

export async function sendVerificationEmail(email, code) {
    try {
        await transporter.sendMail({
            from: "Sustainable Marketplace - Do Not Reply",
            to: email,
            subject: "Your Verification Code",
            text: `Hello! Your verification code to create an account is ${code}.`
        })
    } catch(err) {
        throw err
    }
}

module.exports = { sendVerificationEmail }