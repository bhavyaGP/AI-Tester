const axios = require("axios");
require("dotenv").config();

const sendEmail = async ({ to, subject, html }) => {
  const apikey = process.env.BROVO_API_KEY; // Fixed typo from BROVO_API_KEY

  if (!apikey) {
    console.error(
      "❌ Brevo API key is not configured. Please set BREVO_API_KEY in environment variables.",
    );
    throw new Error("Brevo API key is missing");
  }

  const url = "https://api.brevo.com/v3/smtp/email";
  const headers = {
    "Content-Type": "application/json",
    "api-key": apikey,
    Accept: "application/json",
  };

  const data = {
    sender: {
      email: "iamquicklearn.ai@gmail.com",
      name: "QuickLearnAI",
    },
    to: [
      {
        email: to,
        name: to.split("@")[0], // Extract name from email
      },
    ],
    subject: subject,
    htmlContent: html,
  };

  try {
    const response = await axios.post(url, data, { headers });
    console.log(`✅ Email sent successfully to: ${to}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send email to: ${to}`);
    console.error("Error:", error.response?.data?.message || error.message);
    throw error;
  }
};

module.exports = sendEmail;
