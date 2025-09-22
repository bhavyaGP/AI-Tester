const axios = require("axios");
const jwt = require("jsonwebtoken");
const { oauth2Client } = require("../utils/googleclient");
const Student = require("../models/student.model");
const UsageLogs = require("../models/usage.model");

exports.googleAuth = async (req, res, next) => {
  const code = req.query.code;
  const { role } = req.body;

  if (!code) {
    return res.status(400).json({ message: "Authorization code is required" });
  }

  try {
    const googleRes = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(googleRes.tokens);

    const userRes = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`,
    );
    const { email, name, picture } = userRes.data;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Unable to retrieve email from Google" });
    }

    let user = await Student.findOne({ email });
    if (!user) {
      user = await Student.create({
        avatar: picture,
        username: name,
        email,
        phone: null,
        membership: "Explorer",
        membershipDetails: {},
        usage: {},
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );
    res.status(200).json({
      message: "Login successful",
      token,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
