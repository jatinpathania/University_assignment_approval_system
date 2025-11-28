const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

exports.sendWelcomeEmail = async ({ email, name, password, role }) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Welcome to the University Assignment Approval System, ${name}!`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Welcome, ${name}!</h2>
                    <p>Your account has been successfully created as a *${role.toUpperCase()}* in the University Assignment Approval System.</p>
                    <p>Please use the following temporary credentials to log in:</p>
                    <table style="border: 1px solid #ddd; border-collapse: collapse; margin-top: 15px;">
                        <tr>
                            <th style="padding: 10px; border: 1px solid #ddd; background-color: #f2f2f2; text-align: left;">Email:</th>
                            <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
                        </tr>
                        <tr>
                            <th style="padding: 10px; border: 1px solid #ddd; background-color: #f2f2f2; text-align: left;">Password:</th>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #d9534f;">${password}</td>
                        </tr>
                    </table>
                    <p style="margin-top: 20px;">Please log in and change your password immediately.</p>
                    <p>Thank you.</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Welcome email sent: %s", info.messageId);
        return true;

    } catch (error) {
        console.error("Error sending welcome email to %s:", email, error);
        return false;
    }
};