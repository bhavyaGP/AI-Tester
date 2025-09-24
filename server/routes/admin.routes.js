const express = require("express");
const router = express.Router();
const {
  getOrderStats,
  getOrders,
} = require("../controller/payment.controller");
const { verifyAdmin } = require("../middleware/auth.middleware");
const {
  getPendingTeacherRequests,
  handleTeacherRequest,
  getNewStudents,
} = require("../controller/admin.controller");

router.get("/orders/stats", verifyAdmin, getOrderStats);
router.get("/orders", verifyAdmin, getOrders);
router.post("/teachers/handle-request", verifyAdmin, handleTeacherRequest);
router.get("/new-students", verifyAdmin, getNewStudents);

module.exports = router;
// hii
