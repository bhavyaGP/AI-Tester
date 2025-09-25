const request = require("supertest");
const express = require("express");

// Mock middleware and controllers
const mockVerifyAdmin = jest.fn((req, res, next) => next()); // Default to success
const mockGetOrderStats = jest.fn();
const mockGetOrders = jest.fn();
const mockHandleTeacherRequest = jest.fn();
const mockGetNewStudents = jest.fn();

// Mock the modules that contain these functions using paths relative to the test file
// Based on the provided import path for admin.routes, the test file is likely
// three levels up from the 'server' directory, e.g., 'tests/unit/routes/admin.routes.test.js'.
// Therefore, paths to server modules will start with '../../../server/'.
jest.mock("../../../server/middleware/auth.middleware", () => ({
  verifyAdmin: mockVerifyAdmin,
}));

jest.mock("../../../server/controller/payment.controller", () => ({
  getOrderStats: mockGetOrderStats,
  getOrders: mockGetOrders,
}));

jest.mock("../../../server/controller/admin.controller", () => ({
  // getPendingTeacherRequests is in the controller but not used in this specific router file
  handleTeacherRequest: mockHandleTeacherRequest,
  getNewStudents: mockGetNewStudents,
}));

// The router to be tested
const adminRoutes = require("../../../server/routes/admin.routes");

// Create a simple express app to test the router
const app = express();
app.use(express.json()); // Needed for POST requests
app.use("/admin", adminRoutes); // Mount the router under /admin

// Generic error handling middleware to catch errors passed by `next(err)`
app.use((err, req, res, next) => {
  console.error(err); // Log the error for debugging purposes
  res.status(500).json({ message: "Internal Server Error" });
});

const ORIGINAL_ENV = process.env;

describe("Admin Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
    // Reset environment variables
    jest.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://localhost:27017/testdb',
      JWT_SECRET: 'test-jwt-secret-key-for-testing',
      FRONTEND_URL: 'http://localhost:5173',
      INTERNAL_API_KEY: 'test-internal-api-key',
      PORT: '3001',
      SOCKET_PORT: '5002',
    };
    // Ensure verifyAdmin calls next by default, simulating successful authentication
    mockVerifyAdmin.mockImplementation((req, res, next) => next());
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe("GET /admin/orders/stats", () => {
    it("should call verifyAdmin and getOrderStats and return order statistics", async () => {
      const mockStats = { totalOrders: 10, totalRevenue: 1000, averageOrderValue: 100 };
      mockGetOrderStats.mockImplementationOnce((req, res) => res.status(200).json(mockStats));

      const res = await request(app).get("/admin/orders/stats");

      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
      expect(mockGetOrderStats).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockStats);
    });

    it("should return 500 if getOrderStats throws an error", async () => {
      const errorMessage = "Failed to fetch order stats";
      // Simulate the controller passing an error to the next middleware
      mockGetOrderStats.mockImplementationOnce((req, res, next) => next(new Error(errorMessage)));

      const res = await request(app).get("/admin/orders/stats");

      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
      expect(mockGetOrderStats).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ message: "Internal Server Error" }); // Caught by the generic error handler
    });
  });

  describe("GET /admin/orders", () => {
    it("should call verifyAdmin and getOrders and return a list of orders", async () => {
      const mockOrders = [{ id: "order1", amount: 50, customer: "Alice" }, { id: "order2", amount: 75, customer: "Bob" }];
      mockGetOrders.mockImplementationOnce((req, res) => res.status(200).json(mockOrders));

      const res = await request(app).get("/admin/orders");

      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
      expect(mockGetOrders).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockOrders);
    });

    it("should return 500 if getOrders throws an error", async () => {
      const errorMessage = "Failed to fetch orders";
      mockGetOrders.mockImplementationOnce((req, res, next) => next(new Error(errorMessage)));

      const res = await request(app).get("/admin/orders");

      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
      expect(mockGetOrders).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ message: "Internal Server Error" });
    });
  });

  describe("POST /admin/teachers/handle-request", () => {
    const requestBody = { teacherId: "teacher123", status: "approved", reason: "Good profile" };

    it("should call verifyAdmin and handleTeacherRequest and return success message", async () => {
      const mockResponse = { message: "Teacher request handled successfully", teacherId: "teacher123", status: "approved" };
      mockHandleTeacherRequest.mockImplementationOnce((req, res) => res.status(200).json(mockResponse));

      const res = await request(app)
        .post("/admin/teachers/handle-request")
        .send(requestBody);

      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
      expect(mockHandleTeacherRequest).toHaveBeenCalledTimes(1);
      expect(mockHandleTeacherRequest).toHaveBeenCalledWith(
        expect.objectContaining({ body: requestBody }), // Ensure the request body is passed to the controller
        expect.any(Object), // res object
        expect.any(Function) // next function
      );
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockResponse);
    });

    it("should return 500 if handleTeacherRequest throws an error", async () => {
      const errorMessage = "Failed to handle teacher request";
      mockHandleTeacherRequest.mockImplementationOnce((req, res, next) => next(new Error(errorMessage)));

      const res = await request(app)
        .post("/admin/teachers/handle-request")
        .send(requestBody);

      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
      expect(mockHandleTeacherRequest).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ message: "Internal Server Error" });
    });
  });

  describe("GET /admin/new-students", () => {
    it("should call verifyAdmin and getNewStudents and return a list of new students", async () => {
      const mockStudents = [{ id: "student1", name: "Alice Smith", email: "alice@example.com" }, { id: "student2", name: "Bob Johnson", email: "bob@example.com" }];
      mockGetNewStudents.mockImplementationOnce((req, res) => res.status(200).json(mockStudents));

      const res = await request(app).get("/admin/new-students");

      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
      expect(mockGetNewStudents).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockStudents);
    });

    it("should return 500 if getNewStudents throws an error", async () => {
      const errorMessage = "Failed to fetch new students";
      mockGetNewStudents.mockImplementationOnce((req, res, next) => next(new Error(errorMessage)));

      const res = await request(app).get("/admin/new-students");

      expect(mockVerifyAdmin).toHaveBeenCalledTimes(1);
      expect(mockGetNewStudents).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ message: "Internal Server Error" });
    });
  });
});
