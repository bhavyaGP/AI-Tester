// AI-GENERATED TESTS START
const { app, resetDb, setDb, getDb } = require("../../server/server");
const request = require("supertest");

describe("Server", () => {
  beforeEach(() => {
    resetDb();
  });

  describe("GET /getdata", () => {
    it("should return an empty array when the DB is empty", async () => {
      const res = await request(app).get("/getdata");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return the data from the DB", async () => {
      setDb([{ id: 1, name: "test" }]);
      const res = await request(app).get("/getdata");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 1, name: "test" }]);
    });
  });

  describe("POST /postdata", () => {
    it("should add new data to the DB and return the new data", async () => {
      const newData = { id: 1, name: "test" };
      const res = await request(app).post("/postdata").send(newData);
      expect(res.status).toBe(201);
      expect(res.body).toEqual(newData);
      expect(getDb()).toEqual([newData]);
    });
  });

  describe("DELETE /deletedata/:id", () => {
    it("should delete data from the DB and return a success message", async () => {
      setDb([{ id: 1, name: "test" }, { id: 2, name: "test2" }]);
      const res = await request(app).delete("/deletedata/1");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Item deleted successfully" });
      expect(getDb()).toEqual([{ id: 2, name: "test2" }]);
    });

    it("should return a 404 error if the item is not found", async () => {
      setDb([{ id: 1, name: "test" }]);
      const res = await request(app).delete("/deletedata/2");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Item not found" });
      expect(getDb()).toEqual([{ id: 1, name: "test" }]);
    });

    it("should handle non-numeric ID", async () => {
      setDb([{ id: 1, name: "test" }]);
      const res = await request(app).delete("/deletedata/abc");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Item not found" });
      expect(getDb()).toEqual([{ id: 1, name: "test" }]);
    });
  });

  describe("PUT /updatedata/:id", () => {
    it("should update data in the DB and return the updated data", async () => {
      setDb([{ id: 1, name: "test" }]);
      const updatedData = { id: 1, name: "updated" };
      const res = await request(app).put("/updatedata/1").send(updatedData);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedData);
      expect(getDb()).toEqual([updatedData]);
    });

    it("should return a 404 error if the item is not found", async () => {
      setDb([{ id: 1, name: "test" }]);
      const updatedData = { id: 2, name: "updated" };
      const res = await request(app).put("/updatedata/2").send(updatedData);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Item not found" });
      expect(getDb()).toEqual([{ id: 1, name: "test" }]);
    });

    it("should handle non-numeric ID", async () => {
      setDb([{ id: 1, name: "test" }]);
      const updatedData = { id: 1, name: "updated" };
      const res = await request(app).put("/updatedata/abc").send(updatedData);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Item not found" });
      expect(getDb()).toEqual([{ id: 1, name: "test" }]);
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