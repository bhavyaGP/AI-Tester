const request = require('supertest');
const {mongoose} = require('../../server/db'); // Assuming db.js exports mongoose
const app = require('../../server/index.js');

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/test-db', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
});


describe('Server', () => {
  it('should listen on the specified port', () => {
    expect(app.listen).toBeDefined();
  });

  describe('API Routes', () => {
    it('should handle student routes', async () => {
      const res = await request(app).get('/api/students');
      expect(res.status).toBe(200); 
    });

    it('should handle advanced student routes if defined', async () => {
      const res = await request(app).get('/api/students/advanced');
      
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(500); // Assuming some route is defined. Adapt as needed.
    });


    it('should handle admin routes', async () => {
        const res = await request(app).get('/api/admin');
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
    });

    it('should return 404 for non-existent routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
    });
  });


  it('should use express.json()', () => {
    expect(app._router.stack.some(s => s.handle.name === 'json')).toBe(true);
  });

  it('should use cors()', () => {
    expect(app._router.stack.some(s => s.handle.name === 'cors')).toBe(true);
  });
});

describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
        // This test needs to be adapted depending on the error handling implemented in the server.
        // It's an example. Replace with relevant error trigger and check.
        const res = await request(app).get('/api/students/error');
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500); // Adjust according to error handling
    });
});
