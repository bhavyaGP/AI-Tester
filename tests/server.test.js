const request = require("supertest");
const app = require("./app");

describe("GET /getdata", () => {
  it("should return an empty array if the database is empty", async () => {
    const response = await request(app).get("/getdata");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return the current database content", async () => {
    db = [{ id: 1, name: "test" }];
    const response = await request(app).get("/getdata");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, name: "test" }]);
  });
});

describe("POST /postdata", () => {
  it("should add new data to the database and return the new data", async () => {
    const newData = { id: 1, name: "test" };
    const response = await request(app).post("/postdata").send(newData);
    expect(response.status).toBe(201);
    expect(response.body).toEqual(newData);
    expect(db).toEqual([newData]);
  });
});

describe("DELETE /deletedata/:id", () => {
  it("should delete data by ID and return a success message", async () => {
    db = [{ id: 1, name: "test" }];
    const response = await request(app).delete("/deletedata/1");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Item deleted successfully" });
    expect(db).toEqual([]);
  });
  it("should return a 404 if the item is not found", async () => {
    db = [{ id: 1, name: "test" }];
    const response = await request(app).delete("/deletedata/2");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Item not found" });
  });
  it("should handle non-numeric ID", async () => {
    db = [{ id: 1, name: "test" }];
    const response = await request(app).delete("/deletedata/abc");
    expect(response.status).toBe(404); 
  });
});

describe("PUT /updatedata/:id", () => {
  it("should update data by ID and return the updated data", async () => {
    db = [{ id: 1, name: "test" }];
    const updatedData = { id: 1, name: "updated" };
    const response = await request(app).put("/updatedata/1").send(updatedData);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(updatedData);
    expect(db).toEqual([updatedData]);
  });
  it("should return a 404 if the item is not found", async () => {
    db = [{ id: 1, name: "test" }];
    const updatedData = { id: 2, name: "updated" };
    const response = await request(app).put("/updatedata/2").send(updatedData);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Item not found" });
  });
  it("should handle non-numeric ID", async () => {
    db = [{ id: 1, name: "test" }];
    const updatedData = { id: 1, name: "updated" };
    const response = await request(app).put("/updatedata/abc").send(updatedData);
    expect(response.status).toBe(404); 
  });
});

afterAll(() => {
  db = [];
});
