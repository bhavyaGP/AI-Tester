const Razorpay = require("razorpay");
const Membership = require("../models/membership.model");
const Student = require("../models/student.model");
const Order = require("../models/order.model");
const UsageLogs = require("../models/usage.model");
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
const crypto = require("crypto");

let razorpayInstance = null;

// Initialize Razorpay only if keys are available
if (RAZORPAY_ID_KEY && RAZORPAY_SECRET_KEY) {
  razorpayInstance = new Razorpay({
    key_id: RAZORPAY_ID_KEY,
    key_secret: RAZORPAY_SECRET_KEY,
  });
} else {
  console.warn(
    "Razorpay keys not configured. Payment functionality will be disabled.",
  );
}

const createOrder = async (req, res) => {
  try {
    const { membershipType } = req.body;
    const userId = req.userId;

    // Get membership details
    const membership = await Membership.findOne({ type: membershipType });
    if (!membership) {
      return res
        .status(404)
        .json({ success: false, msg: "Membership type not found" });
    }

    const razorpayOrderId = `order_${Date.now()}_${userId.slice(-6)}`;

    // Create order record
    const order = new Order({
      student: userId,
      membership: membershipType,
      amount: membership.price,
      duration: membership.duration,
      paymentDetails: {
        orderId: razorpayOrderId,
        status: "pending",
      },
      features: membership.features,
    });
    await order.save();

    const options = {
      amount: membership.price * 100, // Converting to paise
      currency: "INR",
      receipt: razorpayOrderId,
      payment_capture: 1,
      notes: {
        membershipType: membershipType,
        userId: userId,
        duration: membership.duration,
      },
    };

    razorpayInstance.orders.create(options, (err, razorpayOrder) => {
      if (err) {
        return res.status(400).json({
          success: false,
          msg: "Error creating order",
          error: err,
        });
      }

      res.status(200).json({
        success: true,
        msg: "Order Created",
        order_id: razorpayOrder.id,
        amount: membership.price,
        membership: membership,
        currency: "INR",
        name: "EduTech Platform",
        description: `${membershipType} Membership - ${membership.duration} days`,
        prefill: {
          name: req.body.name,
          email: req.body.email,
          contact: req.body.contact,
        },
      });
    });
  } catch (error) {
    console.error("Error in createOrder:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      membership,
    } = req.body;

    console.log("Payment verification request body:", req.body);

    // Get userId from middleware (req.userId is set by auth middleware)
    const userId = req.userId;

    if (!userId) {
      console.error("Missing userId in payment verification");
      return res.status(401).json({
        success: false,
        msg: "User authentication required",
      });
    }

    console.log(`Processing payment verification for user: ${userId}`);
    // Verify payment signature
    const generated_signature = crypto
      .createHmac("sha256", RAZORPAY_SECRET_KEY)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid payment signature" });
    }

    let price;
    if (membership === "Achiever") {
      price = 99;
    } else if (membership === "Scholar") {
      price = 49;
    } else if (membership === "Explorer") {
      price = 0;
    } else {
      return res.status(400).json({
        success: false,
        msg: "Invalid membership type",
      });
    }

    const startDate = new Date();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Update order status
    await Order.findOneAndUpdate(
      { "paymentDetails.orderId": razorpay_order_id },
      {
        "paymentDetails.paymentId": razorpay_payment_id,
        "paymentDetails.status": "completed",
        validityPeriod: {
          startDate,
          endDate,
        },
      },
    );
    // Update student membership
    const membershipDetails = {
      startDate,
      endDate,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: price,
      status: "active",
    };

    //to-do: update(assign membership ojbect)  user object with membership
    await Student.findByIdAndUpdate(userId, {
      membership: membership,
      membershipDetails: membershipDetails,
    });

    // Create or update usage logs entry for the user
    try {
      // First, check if user already has a usage log entry
      const existingUsage = await UsageLogs.findOne({ userId });

      if (existingUsage) {
        console.log(`Found existing usage log for user ${userId}, updating...`);

        // Update existing usage log with new plan
        const planLimits = UsageLogs.getPlanLimits(membership);

        // Reset all usage limits to the new plan limits
        existingUsage.ytSummary = planLimits.ytSummary;
        existingUsage.quiz = planLimits.quiz;
        existingUsage.chatbot = planLimits.chatbot;
        existingUsage.mindmap = planLimits.mindmap;
        existingUsage.p2pDoubt = planLimits.p2pDoubt;
        existingUsage.joinQuiz = planLimits.joinQuiz;
        existingUsage.modelselect = planLimits.modelselect;
        existingUsage.difficultychoose = planLimits.difficultychoose;

        // Update plan details
        existingUsage.planType = membership;
        existingUsage.planExpiresAt = endDate;
        existingUsage.planRenewedAt = new Date();
        existingUsage.originalLimits = planLimits;
        existingUsage.updatedAt = new Date();

        await existingUsage.save();
        console.log(
          `✅ Successfully updated usage log for user ${userId} with ${membership} plan`,
        );
        console.log(`Plan expires at: ${endDate}`);
        console.log(`New limits:`, planLimits);
      } else {
        console.log(
          `No existing usage log found for user ${userId}, creating new one...`,
        );

        // Create new usage log entry with proper expiration date
        const newUsageLog = await UsageLogs.createForUser(
          userId,
          membership,
          endDate,
        );
        console.log(
          `✅ Successfully created new usage log for user ${userId} with ${membership} plan`,
        );
        console.log(`Usage log ID: ${newUsageLog._id}`);
        console.log(`Plan expires at: ${endDate}`);
        console.log(`Initial limits:`, UsageLogs.getPlanLimits(membership));
      }

      // Verify the usage log was created/updated properly
      const verifyUsage = await UsageLogs.findOne({ userId });
      if (verifyUsage) {
        console.log(`✅ Verification: Usage log exists for user ${userId}`);
        console.log(`Current plan: ${verifyUsage.planType}`);
        console.log(`Expires: ${verifyUsage.planExpiresAt}`);
        console.log(
          `Current usage: ytSummary=${verifyUsage.ytSummary}, quiz=${verifyUsage.quiz}, chatbot=${verifyUsage.chatbot}, mindmap=${verifyUsage.mindmap}`,
        );
      } else {
        console.error(
          `❌ Verification failed: No usage log found for user ${userId}`,
        );
      }
    } catch (usageError) {
      console.error("❌ Error creating/updating usage logs:", usageError);
      console.error("Stack trace:", usageError.stack);

      // Don't fail the payment verification, but log the error
      // The payment is still valid, but the user might need manual intervention for usage tracking
      console.log(
        "⚠️ Payment verification will continue despite usage log error",
      );
    }

    res.status(200).json({
      success: true,
      msg: "Payment verified successfully",
      membership: membership,
      membershipDetails,
      isverified: true,
    });
  } catch (error) {
    console.error("Error in verifyPayment:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

// Admin endpoints for order management
const getOrderStats = async (req, res) => {
  try {
    const totalStats = await Order.getTotalRevenue();
    const membershipStats = await Order.getRevenueByMembership();

    res.status(200).json({
      success: true,
      stats: {
        total: totalStats,
        byMembership: membershipStats,
      },
    });
  } catch (error) {
    console.error("Error getting order stats:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

const getOrders = async (req, res) => {
  try {
    const {
      status,
      membership,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    let query = {};
    if (status) query["paymentDetails.status"] = status;
    if (membership) query.membership = membership;
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const orders = await Order.find(query)
      .populate("student", "username email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error getting orders:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getOrderStats,
  getOrders,
};
