// AI-GENERATED TESTS START
const { app, resetDb, setDb, getDb } = require("../../server/server");
const request = require("supertest");

describe("Server", () => {
  beforeEach(() => {
    resetDb();
  });

  describe("GET /getdata", () => {
    it("should return an empty array when DB is empty", async () => {
      const response = await request(app).get("/getdata");
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should return the current database", async () => {
      setDb([{ id: 1, name: "test" }]);
      const response = await request(app).get("/getdata");
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 1, name: "test" }]);
    });
  });

  describe("POST /postdata", () => {
    it("should add new data to the DB and return the new data", async () => {
      const newData = { id: 1, name: "test" };
      const response = await request(app).post("/postdata").send(newData);
      expect(response.status).toBe(201);
      expect(response.body).toEqual(newData);
      expect(getDb()).toEqual([newData]);
    });
  });

  describe("DELETE /deletedata/:id", () => {
    it("should delete data by ID and return success message", async () => {
      setDb([{ id: 1, name: "test" }, { id: 2, name: "test2" }]);
      const response = await request(app).delete("/deletedata/1");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Item deleted successfully" });
      expect(getDb()).toEqual([{ id: 2, name: "test2" }]);
    });
    it("should return 404 if item not found", async () => {
      setDb([{ id: 1, name: "test" }, { id: 2, name: "test2" }]);
      const response = await request(app).delete("/deletedata/3");
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Item not found" });
      expect(getDb()).toEqual([{ id: 1, name: "test" }, { id: 2, name: "test2" }]);
    });
    it("should handle non-numeric ID", async () => {
      setDb([{ id: 1, name: "test" }]);
      const response = await request(app).delete("/deletedata/abc");
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Item not found" });
    });

  });

  describe("PUT /updatedata/:id", () => {
    it("should update existing data and return updated data", async () => {
      setDb([{ id: 1, name: "test" }]);
      const updatedData = { id: 1, name: "updated" };
      const response = await request(app).put("/updatedata/1").send(updatedData);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedData);
      expect(getDb()).toEqual([updatedData]);
    });
    it("should return 200 even if data not found", async () => {
      setDb([{ id: 1, name: "test" }]);
      const updatedData = { id: 2, name: "updated" };
      const response = await request(app).put("/updatedata/2").send(updatedData);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedData);
      expect(getDb()).toEqual([{ id: 1, name: "test" }, updatedData]);
    });
    it("should handle non-numeric ID", async () => {
      setDb([{ id: 1, name: "test" }]);
      const updatedData = { id: 2, name: "updated" };
      const response = await request(app).put("/updatedata/abc").send(updatedData);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedData);
      expect(getDb()).toEqual([{ id: 1, name: "test" }, updatedData]);
    });

  });

  it("should export app, resetDb, setDb, and getDb", () => {
    expect(app).toBeDefined();
    expect(resetDb).toBeDefined();
    expect(setDb).toBeDefined();
    expect(getDb).toBeDefined();
  });
});

// AI-GENERATED TESTS END