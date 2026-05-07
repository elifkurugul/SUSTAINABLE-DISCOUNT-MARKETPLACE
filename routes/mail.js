import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

export async function sendVerificationEmail(email, code) {
    await transporter.sendMail({
        from: `"do not reply - DZE Sustainable Marketplace" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Verification Code",
        text: `Hello! Your verification code to create an account is ${code}.`
    })
}