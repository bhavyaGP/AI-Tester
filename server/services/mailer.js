const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendMail({ to , teacherName, username, password }) {
    try {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teacher Registration Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 20px;
        }
        h1 {
            color: #4CAF50;
            margin-top: 0;
        }
        .credentials {
            background-color: #e8f5e9;
            border: 1px solid #a5d6a7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 20px;
            font-size: 0.9em;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to ProgressMatrix!</h1>
        <p>Dear ${teacherName || `teacher`},</p>
        <p>Congratulations! You have been successfully registered as a teacher on our platform. We're excited to have you join our community of educators.</p>
        
        <div class="credentials">
            <p><strong>Your account details:</strong></p>
            <p>Username: ${username}</p>
            <p>Password: ${password}</p>
        </div>
        
        <p>Please log in to your account and change your password as soon as possible for security reasons.</p>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        
        <p>We look forward to your valuable contributions!</p>
        
        <p>Best regards,<br>The Education Team</p>
        
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html> 
        `;

        const msg = {
            to: to, 
            from: {
                name: "Bhavya Prajapati",
                email: process.env.EMAIL_USERNAME, // Sender email
            },
            subject: 'Welcome to ProgressMatrix!',
            text: 'Welcome to ProgressMatrix!',
            html: html
        };  
        await sgMail.send(msg);
        console.log('Email sent successfully');
        
        return { message: 'Email sent successfully' };
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
}

module.exports = {
    sendMail
};
