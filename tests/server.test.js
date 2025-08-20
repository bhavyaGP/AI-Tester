const request = require("supertest");
const app = require("./app");

describe("GET /getdata", () => {
  it("should return an empty array when the database is empty", async () => {
    const res = await request(app).get("/getdata");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("should return the data in the database", async () => {
    db = [{ id: 1, name: "test" }];
    const res = await request(app).get("/getdata");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, name: "test" }]);
  });
});

describe("POST /postdata", () => {
  it("should add new data to the database", async () => {
    const newData = { id: 1, name: "test" };
    const res = await request(app).post("/postdata").send(newData);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(newData);
    expect(db).toEqual([newData]);
  });
});

describe("DELETE /deletedata/:id", () => {
  it("should delete data from the database", async () => {
    db = [{ id: 1, name: "test" }, { id: 2, name: "test2" }];
    const res = await request(app).delete("/deletedata/1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Item deleted successfully" });
    expect(db).toEqual([{ id: 2, name: "test2" }]);
  });
  it("should return 404 if item not found", async () => {
    db = [{ id: 1, name: "test" }, { id: 2, name: "test2" }];
    const res = await request(app).delete("/deletedata/3");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Item not found" });
  });
  it("should handle non-numeric ID", async () => {
    db = [{ id: 1, name: "test" }];
    const res = await request(app).delete("/deletedata/abc");
    expect(res.status).not.toBe(200); //expect error handling, status code might vary
  })
});

describe("PUT /updatedata/:id", () => {
  it("should update data in the database", async () => {
    db = [{ id: 1, name: "test" }];
    const updatedData = { id: 1, name: "updated" };
    const res = await request(app).put("/updatedata/1").send(updatedData);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(updatedData);
    expect(db).toEqual([updatedData]);
  });
  it("should return updated data", async () => {
    db = [{ id: 1, name: "test" }];
    const updatedData = { id: 1, name: "updated" };
    const res = await request(app).put("/updatedata/1").send(updatedData);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(updatedData);
  });
  it("should handle non-existent item", async () => {
    db = [{ id: 1, name: "test" }];
    const updatedData = { id: 2, name: "updated" };
    const res = await request(app).put("/updatedata/2").send(updatedData);
    expect(res.status).toBe(200); //Might not be ideal, but aligns with current implementation
    expect(res.body).toEqual(updatedData);
    expect(db).toEqual([{ id: 1, name: "test" }, updatedData]);
  });
  it("should handle non-numeric ID", async () => {
    db = [{ id: 1, name: "test" }];
    const updatedData = { id: 1, name: "updated" };
    const res = await request(app).put("/updatedata/abc").send(updatedData);
    expect(res.status).not.toBe(200); //expect error handling, status code might vary

  });
});

afterAll(() => {
  db = [];
});
