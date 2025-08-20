// AI-GENERATED TESTS START
```javascript
const { app, resetDb, setDb, getDb } = require("../../server");
const request = require("supertest");

describe("Server", () => {
  beforeEach(() => {
    resetDb();
  });

  describe("GET /getdata", () => {
    it("should return an empty array when the database is empty", async () => {
      const response = await request(app).get("/getdata");
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should return the current database content", async () => {
      setDb([{ id: 1, name: "test" }]);
      const response = await request(app).get("/getdata");
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 1, name: "test" }]);
    });
  });

  describe("POST /postdata", () => {
    it("should add new data to the database", async () => {
      const newData = { id: 1, name: "test" };
      const response = await request(app).post("/postdata").send(newData);
      expect(response.status).toBe(201);
      expect(response.body).toEqual(newData);
      expect(getDb()).toEqual([newData]);
    });

    it("should handle empty request body", async () => {
      const response = await request(app).post("/postdata").send({});
      expect(response.status).toBe(201);
      expect(getDb()).toEqual([{}]);
    });
  });

  describe("DELETE /deletedata/:id", () => {
    it("should delete data by ID", async () => {
      setDb([{ id: 1, name: "test1" }, { id: 2, name: "test2" }]);
      const response = await request(app).delete("/deletedata/1");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Item deleted successfully" });
      expect(getDb()).toEqual([{ id: 2, name: "test2" }]);
    });

    it("should return 404 if item not found", async () => {
      setDb([{ id: 1, name: "test1" }, { id: 2, name: "test2" }]);
      const response = await request(app).delete("/deletedata/3");
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Item not found" });
      expect(getDb()).toEqual([{ id: 1, name: "test1" }, { id: 2, name: "test2" }]);
    });

    it("should handle non-numeric ID", async () => {
      setDb([{ id: 1, name: "test1" }]);
      const response = await request(app).delete("/deletedata/abc");
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Item not found" });
      expect(getDb()).toEqual([{ id: 1, name: "test1" }]);
    });
  });


  describe("PUT /updatedata/:id", () => {
    it("should update data by ID", async () => {
      setDb([{ id: 1, name: "test1" }, { id: 2, name: "test2" }]);
      const updatedData = { id: 1, name: "updated" };
      const response = await request(app).put("/updatedata/1").send(updatedData);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedData);
      expect(getDb()).toEqual([updatedData, { id: 2, name: "test2" }]);
    });

    it("should return 404 if item not found", async () => {
      setDb([{ id: 1, name: "test1" }, { id: 2, name: "test2" }]);
      const updatedData = { id: 3, name: "updated" };
      const response = await request(app).put("/updatedata/3").send(updatedData);
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Item not found" });
      expect(getDb()).toEqual([{ id: 1, name: "test1" }, { id: 2, name: "test2" }]);
    });
    it("should handle non-numeric ID", async () => {
      setDb([{ id: 1, name: "test1" }]);
      const updatedData = { id: 1, name: "updated" };
      const response = await request(app).put("/updatedata/abc").send(updatedData);
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Item not found" });
      expect(getDb()).toEqual([{ id: 1, name: "test1" }]);
    });
  });

  it("should export app, resetDb, setDb, and getDb", () => {
    expect(app).toBeDefined();
    expect(resetDb).toBeDefined();
    expect(setDb).toBeDefined();
    expect(getDb).toBeDefined();
  });
});

```
// AI-GENERATED TESTS END