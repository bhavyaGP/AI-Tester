// AI-GENERATED TESTS START
const { app, resetDb, setDb, getDb } = require("../../../server/routes/auth");
const request = require("supertest");
const bcrypt = require("bcrypt");
const User = require("../../../server/models/user");

describe("Auth Router", () => {
  beforeAll(async () => {
    await setDb();
  });

  afterAll(async () => {
    await resetDb();
  });

  describe("POST /signup", () => {
    it("should create a new user", async () => {
      const res = await request(app)
        .post("/signup")
        .send({
          firstName: "John",
          lastName: "Doe",
          emailId: "john.doe@example.com",
          password: "password123",
        });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User Added Successfully!!!");
      expect(res.body.data).toBeDefined();
      expect(res.body.data._id).toBeDefined();
    });

    it("should return 400 if validation fails", async () => {
      const res = await request(app)
        .post("/signup")
        .send({
          firstName: "John",
          lastName: "Doe",
          emailId: "invalid-email",
          password: "password",
        });
      expect(res.status).toBe(400);
    });

    it("should return 400 if email already exists", async () => {
      const passwordHash = await bcrypt.hash("password123", 10);
      const user = new User({
          firstName: "John",
          lastName: "Doe",
          emailId: "john.doe@example.com",
          password: passwordHash,
        });
      await user.save();

      const res = await request(app)
        .post("/signup")
        .send({
          firstName: "John",
          lastName: "Doe",
          emailId: "john.doe@example.com",
          password: "password123",
        });
      expect(res.status).toBe(400);
    });

  });

  describe("POST /login", () => {
    it("should login a user", async () => {
      const passwordHash = await bcrypt.hash("password123", 10);
      const user = new User({
        firstName: "Jane",
        lastName: "Doe",
        emailId: "jane.doe@example.com",
        password: passwordHash,
      });
      await user.save();

      const res = await request(app)
        .post("/login")
        .send({
          emailId: "jane.doe@example.com",
          password: "password123",
        });
      expect(res.status).toBe(200);
      expect(res.body._id).toBeDefined();
    });

    it("should return 400 if credentials are invalid", async () => {
      const res = await request(app)
        .post("/login")
        .send({
          emailId: "jane.doe@example.com",
          password: "wrong-password",
        });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /logout", () => {
    it("should logout a user", async () => {
      const res = await request(app).post("/logout");
      expect(res.status).toBe(200);
      expect(res.text).toBe("Logout Successful!!!");
    });
  });
});

// AI-GENERATED TESTS END