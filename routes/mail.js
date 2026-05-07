const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

export async function sendVerificationEmail(email, code) {
    await transporter.sendMail({
        from: "Do Not Reply - Sustainable Marketplace",
        to: email,
        subject: "Your Verification Code",
        text: `Hello! Your verification code to create an account is ${code}.`
    })
}