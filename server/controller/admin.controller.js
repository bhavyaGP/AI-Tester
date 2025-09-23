const Admin = require("../models/admin.model");
const Teacher = require("../models/teacher.model");
const Student = require("../models/student.model");
const redis = require("../redis.connection");

// Get all pending teacher requests
async function getPendingTeacherRequests(req, res) {
  try {
    // Find all teachers with pending approval status
    const pendingTeachers = await Teacher.find({
      approvalStatus: "pending",
    }).select(
      "_id username email avatar highestQualification experience subject certification createdAt",
    );

    res.status(200).json({
      success: true,
      pendingTeachers,
    });
  } catch (error) {
    console.log("Error fetching pending teacher requests:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching teacher requests",
      error: error.message,
    });
  }
}

// Handle teacher approval/rejection
async function handleTeacherRequest(req, res) {
  try {
    const { teacherId, action, reason } = req.body;

    if (!teacherId || !action) {
      return res.status(400).json({
        success: false,
        message: "Teacher ID and action are required",
      });
    }

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be either "approve" or "reject"',
      });
    }

    // Find the teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Update teacher approval status
    teacher.approvalStatus = action === "approve" ? "approved" : "rejected";

    // Add rejection reason if provided
    if (action === "reject" && reason) {
      teacher.rejectionReason = reason;
    }

    await teacher.save();

    // If approved, add teacher to Redis for online availability
    if (action === "approve") {
      const subjects = teacher.subject.map((sub) => ({
        field: sub.field,
        subcategory: sub.subcategory,
      }));

      await redis.HSET(
        `teacher:${teacher._id}`,
        "email",
        teacher.email,
        "username",
        teacher.username,
        "rating",
        teacher.rating || 0,
        "doubtsSolved",
        teacher.doubtsSolved || 0,
        "field",
        subjects[0]?.field || "",
        "subcategory",
        Array.isArray(subjects[0]?.subcategory)
          ? subjects[0]?.subcategory.join(",")
          : subjects[0]?.subcategory || "",
        "certification",
        JSON.stringify(teacher.certification || []),
      );
    }

    // Record admin action in admin's teacherRequests
    const adminId = req.userId;
    const admin = await Admin.findById(adminId);

    if (admin) {
      // Check if request already exists
      const existingRequestIndex = admin.teacherRequests.findIndex(
        (req) => req.teacherId.toString() === teacherId,
      );

      if (existingRequestIndex !== -1) {
        // Update existing request
        admin.teacherRequests[existingRequestIndex].status =
          action === "approve" ? "approved" : "rejected";
        admin.teacherRequests[existingRequestIndex].actionDate = new Date();
        admin.teacherRequests[existingRequestIndex].actionBy = adminId;
        if (reason) admin.teacherRequests[existingRequestIndex].reason = reason;
      } else {
        // Add new request record
        admin.teacherRequests.push({
          teacherId: teacherId,
          status: action === "approve" ? "approved" : "rejected",
          requestDate: teacher.createdAt,
          actionDate: new Date(),
          actionBy: adminId,
          reason: reason,
        });
      }

      await admin.save();
    }

    res.status(200).json({
      success: true,
      message: `Teacher ${action === "approve" ? "approved" : "rejected"} successfully`,
    });
  } catch (error) {
    console.log("Error processing teacher request:", error);
    res.status(500).json({
      success: false,
      message: "Error processing teacher request",
      error: error.message,
    });
  }
}

// Get new student registrations
async function getNewStudents(req, res) {
  try {
    // Get students registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newStudents = await Student.find({
      createdAt: { $gte: thirtyDaysAgo },
    })
      .select("_id username email avatar membership createdAt")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      students: newStudents,
    });
  } catch (error) {
    console.log("Error fetching new students:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching new students",
      error: error.message,
    });
  }
}

module.exports = {
  getPendingTeacherRequests,
  handleTeacherRequest,
  getNewStudents,
};