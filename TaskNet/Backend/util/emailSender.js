const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 1
});

exports.sendWelcomeEmail = async({ email, name, password, role })=> {
    try{
        const mailOptions = {
            from: `"TaskNet System" <${process.env.EMAIL_USER}>`,
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
                    <p>
                        <a href="${process.env.CLIENT_URL}/login" style="color: #4338ca; font-weight: bold">Click here to Login</a>
                    </p>
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

exports.sendSubmissionNotification = async({ professorEmail, professorName, studentName, assignmentTitle })=> {
    try{
        const mailOptions ={
            from: `"TaskNet System" <${process.env.EMAIL_USER}>`,
            to: professorEmail,
            subject: `New Submission: ${assignmentTitle}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h3>New Assignment Submission</h3>
                    <p>Hello Professor <strong>${professorName}</strong>,</p>
                    <p>Student <strong>${studentName}</strong> has submitted a new assignment for your review.</p>
                    <ul>
                        <li><strong>Title:</strong> ${assignmentTitle}</li>
                        <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
                    </ul>
                    <p>Please log in to your dashboard to review and approve/reject this submission.</p>
                    <a href="${process.env.CLIENT_URL}/login/login" style="display:inline-block; padding:10px 20px; background-color:#4338ca; color:white; text-decoration:none; border-radius:5px;">Go to Dashboard</a>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Submission notification sent: %s", info.messageId);
        return true;
    }catch (error) {
        console.error("Error sending submission notification:", error);
        return false;
    }
};

exports.sendOTP= async(email, otpCode)=>{
    try{
        const mailOptions ={
            from: `"TaskNet Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Action Verification Code: ${otpCode}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h2 style="color: #4338ca;">Verification Required</h2>
                    <p>You are attempting to <strong>Approve</strong> an assignment. Please use the following One-Time Password (OTP) to verify your identity and complete the action.</p>
                    <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                        ${otpCode}
                    </div>
                    <p>This code expires in 10 minutes.</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        return true;
    }
    catch(error){
        console.error("Error sending verification OTP:", error);
        return false;
    }
}

exports.sendStudentNotification= async({ studentEmail, studentName, assignmentTitle, status, professorName, remarks })=>{
    try{
        const color= status === 'Approved' ? '#166534' : '#991b1b';
        const mailOptions= {
            from: `"TaskNet Updates" <${process.env.EMAIL_USER}>`,
            to: studentEmail,
            subject: `Assignment Update: ${status}`,
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h3>Assignment Update</h3>
                    <p>Hello ${studentName},</p>
                    <p>Your assignment <strong>${assignmentTitle}</strong> has been <strong style="color:${color}">${status.toUpperCase()}</strong> by Prof. ${professorName}.</p>
                    <p><strong>Remarks:</strong><br/>${remarks || 'No remarks provided.'}</p>
                    <a href="${process.env.CLIENT_URL}/login" style="color: #4338ca;">View Details</a>
                </div>
            `
        }
        await transporter.sendMail(mailOptions);
        return true;
    }
    catch(error){
        console.error("Error sending student notification:", error);
        return false;
    }
}