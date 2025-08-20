const express = require("express");
const app = express();

app.use(express.json());

let db = []; // in-memory DB

// GET all data
app.get("/getdata", (req, res) => {
  res.status(200).json(db);
});

// POST new data
app.post("/postdata", (req, res) => {
  const newData = req.body;
  db.push(newData);
  res.status(201).json(newData);
});

// DELETE data by ID
app.delete("/deletedata/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const initialLength = db.length;
  db = db.filter((item) => item.id !== id);

  if (db.length === initialLength) {
    return res.status(404).json({ message: "Item not found" });
  }

  res.status(200).json({ message: "Item deleted successfully" });
});

// PUT update data by ID
app.put("/updatedata/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const updatedData = req.body;
  let found = false;

  db = db.map((item) => {
    if (item.id === id) {
      found = true;
      return updatedData;
    }
    return item;
  });

   

  res.status(200).json(updatedData);
});

// ✅ Only listen if run directly
if (require.main === module) {
  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
}

// 👇 Export both app & helper to reset db in tests
module.exports = {
  app,
  resetDb: () => (db = []),
  setDb: (data) => (db = data),
  getDb: () => db,
};
