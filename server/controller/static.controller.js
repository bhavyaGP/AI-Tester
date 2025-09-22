const student = require("../models/student.model");
const teacher = require("../models/teacher.model");
const admin = require("../models/admin.model");
const UsageLogs = require("../models/usage.model");
const jwt = require("jsonwebtoken");
const redis = require("../redis.connection");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const EmailVerificationSession = require("../models/EmailVerificationSession");
const sendEmail = require("../utils/mailer");

async function handlelogin(req, res) {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  // console.log(email, password, role);
  try {
    let user;
    if (role === "student") {
      user = await student
        .findOne({ email })
        .select("+membership +membershipDetails +usage");
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
    } else if (role === "admin") {
      user = await admin.findOne({ email });
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
    } else if (role === "teacher") {
      user = await teacher.findOne({ email });

      if (user == null || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if teacher account is approved
      if (user.approvalStatus !== "approved") {
        return res.status(403).json({
          message: "Your account is pending approval by admin",
          approvalStatus: user.approvalStatus,
        });
      }

      user.isOnline = true;
      // insert the user to redis (store string id)
      await redis.sAdd("online_teachers", user._id.toString());

      // Safely handle subjects array - check if it exists and has items
      let subjects = [];
      if (
        user.subject &&
        Array.isArray(user.subject) &&
        user.subject.length > 0
      ) {
        subjects = user.subject.map((sub) => ({
          field: sub.field || "",
          subcategory: sub.subcategory || "",
        }));
      } else {
        // Default empty subject if none exists
        subjects = [{ field: "", subcategory: "" }];
      }

      // Ensure all HSET values are strings (Redis client requires string/Buffer)
      // Store teacher details in Redis hash (node-redis v4 uses camelCase methods)
      try {
        await redis.hSet(`teacher:${user._id.toString()}`, {
          email: String(user.email || ""),
          username: String(user.username || ""),
          rating: String(user.rating || 0),
          doubtsSolved: String(user.doubtsSolved || 0),
          field: String(subjects[0].field || ""),
          // Store subcategory array as JSON string for reliable parsing later
          subcategory: JSON.stringify(
            Array.isArray(subjects[0].subcategory)
              ? subjects[0].subcategory
              : subjects[0].subcategory
                ? [subjects[0].subcategory]
                : [],
          ),
          certification: JSON.stringify(user.certification || []),
        });
      } catch (redisErr) {
        console.error("Failed to cache teacher in Redis:", redisErr.message);
      }
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Generate token for all successful logins
    const token = jwt.sign(
      { id: user._id, role: user.role || role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    // Set cookie for all successful logins
    res.cookie("authtoken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });

    const userResponse = {
      _id: user._id,
      email: user.email,
      username: user.username,
      isOnline: user.isOnline || false,
      avatar: user.avatar || "",
      role: role,
      rating: user.rating || 0,
      doubtsSolved: user.doubtsSolved || 0,
      subject: user.subject || [],
      certification: user.certification || [],
    };

    // Add membership details for students
    if (role === "student") {
      userResponse.membership = {
        type: user.membership,
        details: user.membershipDetails,
        usage: user.usage,
        status: user.membershipDetails?.status || "pending",
        expiresAt: user.membershipDetails?.endDate || null,
        features: {
          ytSummary: {
            limit: user.membershipDetails?.features?.ytSummary || 3,
            used: user.usage?.summarizedVideos || 0,
          },
          quizzes: {
            limit: user.membershipDetails?.features?.quiz || 0,
            taken: user.usage?.quizzesTaken || 0,
          },
        },
      };
    }

    // Send consistent response format for all roles
    return res.status(200).json({
      message: "Login successful",
      user: userResponse,
      token,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function handleregister(req, res) {
  try {
    const { email, password, role, username, phone } = req.body;

    // Enhanced validation
    if (!email || !role || !username || !password) {
      return res.status(400).json({
        message: "Email, role, username, and password are required",
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    // Password validation (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Username validation (minimum 3 characters)
    if (username.length < 3) {
      return res.status(400).json({
        message: "Username must be at least 3 characters long",
      });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    let existingUser;

    // Check if user already exists in any collection
    if (role === "student") {
      existingUser = await student.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Student with this email already exists" });
      }
    } else if (role === "admin") {
      existingUser = await admin.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Admin with this email already exists" });
      }
    } else if (role === "teacher") {
      existingUser = await teacher.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Teacher with this email already exists" });
      }
    } else {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    // Check if there's already a pending verification session for this email
    const existingSession = await EmailVerificationSession.findOne({
      "user.email": normalizedEmail,
      type: role,
    });

    if (existingSession) {
      return res.status(400).json({
        message:
          "A verification email has already been sent to this address. Please check your inbox or wait before requesting another.",
      });
    }

    // Prepare user data for verification session
    let userData = {
      email: normalizedEmail,
      password: password,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`,
      username,
      phone: phone || null,
      role,
    };

    // Add role-specific data
    if (role === "teacher") {
      const {
        highestQualification,
        experience,
        subject,
        subcategory,
        certification,
      } = req.body;

      // Process subject data to ensure correct format
      let formattedSubjects = [];
      if (subject && subcategory) {
        const subjectObject = {
          field: subject,
          subcategory: Array.isArray(subcategory) ? subcategory : [subcategory],
        };
        formattedSubjects = [subjectObject];
      }

      userData = {
        ...userData,
        highestQualification: highestQualification || "",
        experience: experience || 0,
        subject: formattedSubjects,
        certification: certification
          ? Array.isArray(certification)
            ? certification
            : [certification]
          : [],
        approvalStatus: "pending",
      };
    }

    // Generate unique session ID
    const sessionId = uuidv4();

    // Create email verification session
    const verificationSession = new EmailVerificationSession({
      session: sessionId,
      type: role,
      user: userData,
    });

    await verificationSession.save();

    // Create verification link
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?session=${sessionId}`;

    // Email HTML template
    const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #007bff; margin: 0; font-size: 28px;">QuickLearnAI</h1>
                    </div>

                    <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email Address</h2>

                    <p style="color: #555; font-size: 16px; line-height: 1.6;">Hello ${username},</p>

                    <p style="color: #555; font-size: 16px; line-height: 1.6;">
                        Thank you for signing up with QuickLearnAI! To complete your registration as a ${role} and start your learning journey,
                        please verify your email address by clicking the button below:
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationLink}"
                           style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(0,123,255,0.3);">
                            Verify My Email
                        </a>
                    </div>

                    <p style="color: #888; font-size: 14px; line-height: 1.6;">
                        If the button above doesn't work, you can copy and paste this link into your browser:
                    </p>
                    <p style="color: #007bff; font-size: 14px; word-break: break-all;">
                        ${verificationLink}
                    </p>

                    <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
                        <p style="color: #888; font-size: 12px; line-height: 1.4; margin: 0;">
                            This verification link will expire in 1 hour for security reasons. If you didn't create an account with us,
                            please ignore this email.
                        </p>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <p style="color: #888; font-size: 12px;">
                        © 2024 QuickLearnAI. All rights reserved.
                    </p>
                </div>
            </div>
        `;

    // Send verification email
    await sendEmail({
      to: normalizedEmail,
      subject: "Verify Your Email - QuickLearnAI",
      html: emailHtml,
    });

    // Return success response
    res.status(200).json({
      success: true,
      message:
        "Registration initiated successfully! Please check your email to verify your account.",
      email: normalizedEmail,
      role: role,
    });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({
      message: "Internal server error during registration",
    });
  }
}

async function handlelogout(req, res) {
  try {
    res.clearCookie("authtoken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    console.error("Logout error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

const verifyUserEmail = async (req, res) => {
  try {
    // Validate required fields

    console.log("request come to verify email in /verify-email")
    if (!req.body.email || !req.body.username) {
      return res
        .status(400)
        .json({ error: "Email and username are required." });
    }

    // Normalize email to lowercase
    const email = req.body.email.toLowerCase();

    // Check if user already exists
    const existingStudent = await student.findOne({ email });
    const existingTeacher = await teacher.findOne({ email });
    const existingAdmin = await admin.findOne({ email });

    if (existingStudent || existingTeacher || existingAdmin) {
      return res
        .status(400)
        .json({ error: "Email already exists. Try logging in." });
    }

    // Generate UUID session
    const session = uuidv4();

    // Store session in the EmailVerificationSession model
    const userData = {
      ...req.body,
      email: email, // Use normalized email
    };

    const newSession = new EmailVerificationSession({
      session,
      type: req.body.role || "student",
      user: userData,
    });
    await newSession.save();

    // Verification link
    const verificationLink = `${process.env.SERVER_URL_1}/verify?session=${session}`;
    console.log("Verification link:", verificationLink);

    // Email content using the mailer utility
    const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #007bff; margin: 0; font-size: 28px;">QuickLearnAI</h1>
                    </div>

                    <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email Address</h2>

                    <p style="color: #555; font-size: 16px; line-height: 1.6;">Hello ${req.body.username},</p>

                    <p style="color: #555; font-size: 16px; line-height: 1.6;">
                        Thank you for signing up with QuickLearnAI! To complete your registration and start your learning journey,
                        please verify your email address by clicking the button below:
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationLink}"
                           style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(0,123,255,0.3);">
                            Verify My Email
                        </a>
                    </div>

                    <p style="color: #888; font-size: 14px; line-height: 1.6;">
                        If the button above doesn't work, you can copy and paste this link into your browser:
                    </p>
                    <p style="color: #007bff; font-size: 14px; word-break: break-all;">
                        ${verificationLink}
                    </p>

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #888; font-size: 14px; margin: 5px 0;">
                            <strong>Important:</strong> This verification link will expire in 1 hour for security reasons.
                        </p>
                        <p style="color: #888; font-size: 14px; margin: 5px 0;">
                            If you didn't create an account with QuickLearnAI, please ignore this email.
                        </p>
                    </div>

                    <div style="margin-top: 30px; text-align: center;">
                        <p style="color: #555; font-size: 16px; margin: 0;">
                            Best regards,<br/>
                            <strong style="color: #007bff;">Team QuickLearnAI</strong>
                        </p>
                    </div>
                </div>
            </div>
        `;

    // Send email using the mailer utility
    await sendEmail({
      to: email,
      subject: "Verify Your Email - QuickLearnAI",
      html: emailHtml,
    });

    res.status(200).json({
      message:
        "Verification email sent successfully. Please check your email and click the verification link to complete your registration.",
    });
  } catch (error) {
    console.error("Error in verifyUserEmail:", error.message);
    res.status(500).json({
      error: "Failed to send verification email. Please try again later.",
    });
  }
};

const verifyEmailSession = async (req, res) => {
  const { session } = req.query;
  console.log("request come to /verify with session:", session);
  console.log("Verifying session:", session);

  try {
    // Check if this is an API call (from React frontend) or direct browser access
    const isApiCall =
      (req.headers.accept && req.headers.accept.includes("application/json")) ||
      req.headers["content-type"] === "application/json" ||
      req.query.api === "true";

    // Find the session in EmailVerificationSession
    const verificationSession = await EmailVerificationSession.findOne({
      session,
    });

    if (!verificationSession) {
      if (isApiCall) {
        return res.status(400).json({
          success: false,
          message:
            "The verification link is invalid or has expired. Please try registering again.",
        });
      }

      return res.status(400).send(`
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Email Verification Failed</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <script src="https://unpkg.com/lucide@latest"></script>
                </head>
                <body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">
                    <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                        <div class="text-center">
                            <i data-lucide="x-circle" class="text-red-500 w-16 h-16 mx-auto mb-4"></i>
                            <h1 class="text-2xl font-bold text-gray-800 mb-4">Email Verification Failed</h1>
                            <p class="text-gray-600 mb-6">The verification link is invalid or has expired. Please try registering again.</p>
                            <div class="flex justify-center space-x-4">
                                <a href="${process.env.FRONTEND_URL}" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
                                    Go to Home
                                </a>
                            </div>
                        </div>
                    </div>

                    <script>
                        lucide.createIcons();
                    </script>
                </body>
                </html>
            `);
    }

    const { user, type } = verificationSession;
    let newUser;

    // Create user based on role/type
    if (type === "student") {
      // Create new student
      newUser = await student.create({
        email: user.email,
        password: user.password,
        avatar: user.avatar,
        username: user.username,
        phone: user.phone,
      });

      // Create UsageLogs entry with Explorer plan for new student
      try {
        await UsageLogs.createForUser(newUser._id, "Explorer");
      } catch (usageError) {
        console.error("Error creating usage log:", usageError.message);
      }
    } else if (type === "admin") {
      // Create new admin
      newUser = await admin.create({
        email: user.email,
        password: user.password,
        username: user.username,
        phone: user.phone,
        avatar: user.avatar,
      });
    } else if (type === "teacher") {
      // Create new teacher
      newUser = await teacher.create({
        email: user.email,
        password: user.password,
        avatar: user.avatar,
        username: user.username,
        phone: user.phone,
        highestQualification: user.highestQualification,
        experience: user.experience,
        subject: user.subject,
        certification: user.certification,
        approvalStatus: user.approvalStatus,
      });
    }

    // Delete the verification session after successful registration
    await EmailVerificationSession.deleteOne({ session });

    // Return JSON for API calls, HTML for direct browser access
    if (isApiCall) {
      return res.status(200).json({
        success: true,
        message:
          type === "teacher"
            ? "Your email has been verified successfully! Your teacher account is now pending admin approval. You will receive an email notification once your account is approved."
            : "Your email has been verified successfully! You can now log in to your account.",
        userType: type,
        userId: newUser._id,
      });
    }

    // HTML response for direct browser access
    res.send(`
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verification Successful</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <script src="https://unpkg.com/lucide@latest"></script>
            </head>
            <body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">
                <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div class="text-center">
                        <i data-lucide="check-circle" class="text-green-500 w-16 h-16 mx-auto mb-4"></i>
                        <h1 class="text-2xl font-bold text-gray-800 mb-4">Email Verification Successful</h1>
                        <p class="text-gray-600 mb-6">Your email has been successfully verified. ${type === "teacher" ? "Your account is pending admin approval. You will receive an email notification once approved." : "You can now log in to your account."} You will be redirected to the home page shortly.</p>
                        <div class="flex justify-center space-x-4">
                            <a href="${process.env.FRONTEND_URL}" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                                Go to Login
                            </a>
                        </div>
                    </div>
                </div>

                <script>
                    lucide.createIcons();
                    setTimeout(() => {
                        window.location.href = "${process.env.FRONTEND_URL}";
                    }, 5000);
                </script>
            </body>
            </html>
        `);
  } catch (error) {
    // Check if this is an API call
    const isApiCall =
      (req.headers.accept && req.headers.accept.includes("application/json")) ||
      req.headers["content-type"] === "application/json" ||
      req.query.api === "true";

    // Delete the verification session even if there's an error to prevent reuse
    try {
      await EmailVerificationSession.deleteOne({ session });
    } catch (deleteError) {
      console.error(
        "Error deleting verification session:",
        deleteError.message,
      );
    }

    if (isApiCall) {
      return res.status(500).json({
        success: false,
        message:
          "An error occurred during email verification. Please try again later.",
        error: error.message,
      });
    }

    res.status(500).send(`
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verification Failed</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <script src="https://unpkg.com/lucide@latest"></script>
            </head>
            <body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">
                <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div class="text-center">
                        <i data-lucide="x-circle" class="text-red-500 w-16 h-16 mx-auto mb-4"></i>
                        <h1 class="text-2xl font-bold text-gray-800 mb-4">Email Verification Failed</h1>
                        <p class="text-gray-600 mb-6">We're sorry, but we couldn't verify your email address. This may be due to an expired or invalid verification link, or a server error.</p>
                        <div class="flex justify-center space-x-4">
                            <a href="${process.env.FRONTEND_URL}" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                                Try Again
                            </a>
                        </div>
                    </div>
                </div>

                <script>
                    lucide.createIcons();
                </script>
            </body>
            </html>
        `);
  }
};

module.exports = {
  handlelogin,
  handlelogout,
  handleregister,
  verifyUserEmail,
  verifyEmailSession,
};
