const express = require("express");
const router = express.Router();

const {
  handlelogin,
  handlelogout,
  handleregister,
  verifyUserEmail,
  verifyEmailSession,
} = require("../controller/static.controller");

router.post("/login", handlelogin);
router.post("/register", handleregister);
router.get("/logout", handlelogout);
router.post("/verify-email", verifyUserEmail);
router.get("/verify", verifyEmailSession);
router.post("/verifyEmailSession", verifyEmailSession);

module.exports = router;
