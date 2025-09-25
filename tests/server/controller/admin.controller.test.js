jest.mock("../../../server/models/admin.model");
jest.mock("../../../server/models/teacher.model");
jest.mock("../../../server/models/student.model");
jest.mock("../../../server/redis.connection");

const { handleTeacherRequest, getNewStudents } = require("../../../server/controller/admin.controller");
const Admin = require("../../../server/models/admin.model");
const Teacher = require("../../../server/models/teacher.model");
const Student = require("../../../server/models/student.model");
const redis = require("../../../server/redis.connection");

describe("Admin Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      userId: "adminId123",
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();

    Admin.findById.mockResolvedValue({
      _id: "adminId123",
      teacherRequests: [],
      save: jest.fn().mockResolvedValue(true),
    });
    Teacher.findById.mockResolvedValue({
      _id: "teacherId123",
      email: "teacher@example.com",
      username: "TeacherUser",
      rating: 4.5,
      doubtsSolved: 100,
      subject: [{ field: "Math", subcategory: ["Algebra", "Geometry"] }],
      certification: [{ name: "Cert1" }],
      approvalStatus: "pending",
      createdAt: new Date(),
      save: jest.fn().mockResolvedValue(true),
    });
    Student.find.mockResolvedValue([]);
    redis.HSET.mockResolvedValue(1);
  });

  describe("handleTeacherRequest", () => {
    it("should return 400 if teacherId or action is missing", async () => {
      req.body = { action: "approve" };

      await handleTeacherRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Teacher ID and action are required",
      });

      jest.clearAllMocks();
      res.status.mockReturnThis();

      req.body = { teacherId: "teacherId123" };

      await handleTeacherRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Teacher ID and action are required",
      });
    });

    it("should return 400 if action is invalid", async () => {
      req.body = { teacherId: "teacherId123", action: "invalid" };

      await handleTeacherRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid action. Must be either "approve" or "reject"',
      });
    });

    it("should return 404 if teacher is not found", async () => {
      Teacher.findById.mockResolvedValue(null);
      req.body = { teacherId: "nonExistentId", action: "approve" };

      await handleTeacherRequest(req, res);

      expect(Teacher.findById).toHaveBeenCalledWith("nonExistentId");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Teacher not found",
      });
    });

    it("should approve a teacher and add to Redis and admin requests", async () => {
      const mockTeacher = {
        _id: "teacherId123",
        email: "teacher@example.com",
        username: "TeacherUser",
        rating: 4.5,
        doubtsSolved: 100,
        subject: [{ field: "Math", subcategory: ["Algebra", "Geometry"] }],
        certification: [{ name: "Cert1" }],
        approvalStatus: "pending",
        createdAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };
      Teacher.findById.mockResolvedValue(mockTeacher);

      const mockAdmin = {
        _id: "adminId123",
        teacherRequests: [],
        save: jest.fn().mockResolvedValue(true),
      };
      Admin.findById.mockResolvedValue(mockAdmin);

      req.body = { teacherId: "teacherId123", action: "approve" };

      await handleTeacherRequest(req, res);

      expect(Teacher.findById).toHaveBeenCalledWith("teacherId123");
      expect(mockTeacher.approvalStatus).toBe("approved");
      expect(mockTeacher.save).toHaveBeenCalled();
      expect(redis.HSET).toHaveBeenCalledWith(
        "teacher:teacherId123",
        "email",
        "teacher@example.com",
        "username",
        "TeacherUser",
        "rating",
        4.5,
        "doubtsSolved",
        100,
        "field",
        "Math",
        "subcategory",
        "Algebra,Geometry",
        "certification",
        JSON.stringify([{ name: "Cert1" }])
      );
      expect(Admin.findById).toHaveBeenCalledWith("adminId123");
      expect(mockAdmin.teacherRequests).toHaveLength(1);
      expect(mockAdmin.teacherRequests[0].teacherId.toString()).toBe("teacherId123");
      expect(mockAdmin.teacherRequests[0].status).toBe("approved");
      expect(mockAdmin.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Teacher approved successfully",
      });
    });

    it("should reject a teacher with a reason and update admin requests", async () => {
      const mockTeacher = {
        _id: "teacherId123",
        email: "teacher@example.com",
        username: "TeacherUser",
        rating: 4.5,
        doubtsSolved: 100,
        subject: [{ field: "Math", subcategory: ["Algebra", "Geometry"] }],
        certification: [{ name: "Cert1" }],
        approvalStatus: "pending",
        createdAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };
      Teacher.findById.mockResolvedValue(mockTeacher);

      const mockAdmin = {
        _id: "adminId123",
        teacherRequests: [],
        save: jest.fn().mockResolvedValue(true),
      };
      Admin.findById.mockResolvedValue(mockAdmin);

      req.body = { teacherId: "teacherId123", action: "reject", reason: "Not enough experience" };

      await handleTeacherRequest(req, res);

      expect(Teacher.findById).toHaveBeenCalledWith("teacherId123");
      expect(mockTeacher.approvalStatus).toBe("rejected");
      expect(mockTeacher.rejectionReason).toBe("Not enough experience");
      expect(mockTeacher.save).toHaveBeenCalled();
      expect(redis.HSET).not.toHaveBeenCalled();
      expect(Admin.findById).toHaveBeenCalledWith("adminId123");
      expect(mockAdmin.teacherRequests).toHaveLength(1);
      expect(mockAdmin.teacherRequests[0].teacherId.toString()).toBe("teacherId123");
      expect(mockAdmin.teacherRequests[0].status).toBe("rejected");
      expect(mockAdmin.teacherRequests[0].reason).toBe("Not enough experience");
      expect(mockAdmin.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Teacher rejected successfully",
      });
    });

    it("should reject a teacher without a reason and update admin requests", async () => {
      const mockTeacher = {
        _id: "teacherId123",
        email: "teacher@example.com",
        username: "TeacherUser",
        rating: 4.5,
        doubtsSolved: 100,
        subject: [{ field: "Math", subcategory: ["Algebra", "Geometry"] }],
        certification: [{ name: "Cert1" }],
        approvalStatus: "pending",
        createdAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };
      Teacher.findById.mockResolvedValue(mockTeacher);

      const mockAdmin = {
        _id: "adminId123",
        teacherRequests: [],
        save: jest.fn().mockResolvedValue(true),
      };
      Admin.findById.mockResolvedValue(mockAdmin);

      req.body = { teacherId: "teacherId123", action: "reject" };

      await handleTeacherRequest(req, res);

      expect(mockTeacher.approvalStatus).toBe("rejected");
      expect(mockTeacher.rejectionReason).toBeUndefined();
      expect(mockTeacher.save).toHaveBeenCalled();
      expect(mockAdmin.teacherRequests).toHaveLength(1);
      expect(mockAdmin.teacherRequests[0].status).toBe("rejected");
      expect(mockAdmin.teacherRequests[0].reason).toBeUndefined();
      expect(mockAdmin.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Teacher rejected successfully",
      });
    });

    it("should update an existing teacher request in admin's records", async () => {
      const mockTeacher = {
        _id: "teacherId123",
        email: "teacher@example.com",
        username: "TeacherUser",
        rating: 4.5,
        doubtsSolved: 100,
        subject: [{ field: "Math", subcategory: ["Algebra", "Geometry"] }],
        certification: [{ name: "Cert1" }],
        approvalStatus: "pending",
        createdAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };
      Teacher.findById.mockResolvedValue(mockTeacher);

      const mockAdmin = {
        _id: "adminId123",
        teacherRequests: [{
          teacherId: "teacherId123",
          status: "pending",
          requestDate: new Date(),
          actionDate: null,
          actionBy: null,
          reason: null,
        }],
        save: jest.fn().mockResolvedValue(true),
      };
      Admin.findById.mockResolvedValue(mockAdmin);

      req.body = { teacherId: "teacherId123", action: "approve" };

      await handleTeacherRequest(req, res);

      expect(mockAdmin.teacherRequests).toHaveLength(1);
      expect(mockAdmin.teacherRequests[0].status).toBe("approved");
      expect(mockAdmin.teacherRequests[0].actionDate).toBeInstanceOf(Date);
      expect(mockAdmin.teacherRequests[0].actionBy).toBe("adminId123");
      expect(mockAdmin.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Teacher approved successfully",
      });
    });

    it("should handle the case where admin is not found gracefully (teacher still processed)", async () => {
      Teacher.findById.mockResolvedValue({
        _id: "teacherId123",
        email: "teacher@example.com",
        username: "TeacherUser",
        rating: 4.5,
        doubtsSolved: 100,
        subject: [{ field: "Math", subcategory: ["Algebra", "Geometry"] }],
        certification: [{ name: "Cert1" }],
        approvalStatus: "pending",
        createdAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      });
      Admin.findById.mockResolvedValue(null);

      req.body = { teacherId: "teacherId123", action: "approve" };

      await handleTeacherRequest(req, res);

      expect(Teacher.findById).toHaveBeenCalledWith("teacherId123");
      expect(Admin.findById).toHaveBeenCalledWith("adminId123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Teacher approved successfully",
      });
    });

    it("should return 500 if there's a server error during teacher processing", async () => {
      Teacher.findById.mockRejectedValue(new Error("DB error"));
      req.body = { teacherId: "teacherId123", action: "approve" };

      await handleTeacherRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Error processing teacher request",
        error: "DB error",
      });
    });

    it("should return 500 if teacher.save fails", async () => {
      const mockTeacher = {
        _id: "teacherId123",
        email: "teacher@example.com",
        username: "TeacherUser",
        rating: 4.5,
        doubtsSolved: 100,
        subject: [{ field: "Math", subcategory: ["Algebra", "Geometry"] }],
        certification: [{ name: "Cert1" }],
        approvalStatus: "pending",
        createdAt: new Date(),
        save: jest.fn().mockRejectedValue(new Error("Save failed")),
      };
      Teacher.findById.mockResolvedValue(mockTeacher);

      req.body = { teacherId: "teacherId123", action: "approve" };

      await handleTeacherRequest(req, res);

      expect(mockTeacher.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Error processing teacher request",
        error: "Save failed",
      });
    });

    it("should return 500 if redis.HSET fails during approval", async () => {
      const mockTeacher = {
        _id: "teacherId123",
        email: "teacher@example.com",
        username: "TeacherUser",
        rating: 4.5,
        doubtsSolved: 100,
        subject: [{ field: "Math", subcategory: ["Algebra", "Geometry"] }],
        certification: [{ name: "Cert1" }],
        approvalStatus: "pending",
        createdAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };
      Teacher.findById.mockResolvedValue(mockTeacher);
      redis.HSET.mockRejectedValue(new Error("Redis error"));

      req.body = { teacherId: "teacherId123", action: "approve" };

      await handleTeacherRequest(req, res);

      expect(redis.HSET).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Error processing teacher request",
        error: "Redis error",
      });
    });
  });

  describe("getNewStudents", () => {
    it("should return a list of new students", async () => {
      const mockStudents = [
        { _id: "s1", username: "Student1", email: "s1@test.com", avatar: "url1", membership: "basic", createdAt: new Date() },
        { _id: "s2", username: "Student2", email: "s2@test.com", avatar: "url2", membership: "premium", createdAt: new Date() },
      ];

      const mockFind = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockStudents),
      };
      Student.find.mockReturnValue(mockFind);

      await getNewStudents(req, res);

      expect(Student.find).toHaveBeenCalledWith(expect.objectContaining({
        createdAt: { $gte: expect.any(Date) },
      }));
      expect(mockFind.select).toHaveBeenCalledWith("_id username email avatar membership createdAt");
      expect(mockFind.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockFind.limit).toHaveBeenCalledWith(50);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        students: mockStudents,
      });
    });

    it("should return an empty array if no new students are found", async () => {
      const mockFind = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      Student.find.mockReturnValue(mockFind);

      await getNewStudents(req, res);

      expect(Student.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        students: [],
      });
    });

    it("should return 500 if there's a server error fetching new students", async () => {
      const mockFind = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error("DB error fetching students")),
      };
      Student.find.mockReturnValue(mockFind);

      await getNewStudents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Error fetching new students",
        error: "DB error fetching students",
      });
    });
  });
});
