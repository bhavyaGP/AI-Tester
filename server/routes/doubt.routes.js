const express = require("express");
const router = express.Router();



const { matchdoubt, getPendingDoubts, getTeacherDoubts, setsolveddoubt ,solvedbyai} = require("../controller/doubt.controller");

router.post("/match/:doubtId", matchdoubt);

/**
 * 📌 API: Get All Pending Doubts
 * Returns a list of doubts that have not been assigned a teacher.
 */
router.get("/pending", getPendingDoubts);

/**
 * 📌 API: Get Teacher’s Assigned Doubts
 * Returns all doubts assigned to a specific teacher.
 */
router.get("/teacher/:teacherId/doubts", getTeacherDoubts);
//api for set status doubt to solved

router.patch("/:doubtId/status", setsolveddoubt);
router.post("/aisolve",solvedbyai)

module.exports = router;

// PATCH /api/doubt/:id/status	Marks doubt as resolved	Update status to "Resolved" in student view
// WebSocket (Socket.IO)	Real-time notifications	Notify frontend for new doubts or messages
// GET /api/doubt/:id	Get specific doubt details	Check doubt status, display details on student's dashboard