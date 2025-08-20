jest.mock('solr-node');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const SolrNode = require('solr-node');
const {search} = require('solr-node');

const port = 3001;

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static("views"));

const client = new SolrNode({
  host: 'localhost',
  port: '8983',
  core: 'bhavya',
  protocol: 'http'
});

app.post('/getProduct', function (req, res) {
  const searchTerm = req.body.name;
  const strQuery = client.query()
    .q("name:" + searchTerm + "* OR college:" + searchTerm + "* OR dept:" + searchTerm + "* OR email:" + searchTerm + "* OR research_areas:" + searchTerm + "* OR website:" + searchTerm + "*")
    .sort('experience', 'asc')
    .rows(100);

  client.search(strQuery, function (err, result) {
    if (err) {
      return res.status(500).send('Internal Server Error');
    }
    res.render('index', { data2: result.response });
  });
});

app.get('/', function (req, res) {
  res.render('search');
});

app.get('/contact', function (req, res) {
  res.render('contact');
});

app.listen(port, () => {
});

describe('Server', () => {
  it('should handle post request to /getProduct', () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      render: jest.fn()
    };
    const mockReq = { body: { name: 'test' } };
    client.search.mockImplementation((query, callback) => {
      callback(null, { response: { numFound: 1 } });
    });
    app.post('/getProduct')(mockReq, mockRes);
    expect(mockRes.render).toHaveBeenCalledWith('index', { data2: { numFound: 1 } });
  });

  it('should handle error in post request to /getProduct', () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      render: jest.fn()
    };
    const mockReq = { body: { name: 'test' } };
    client.search.mockImplementation((query, callback) => {
      callback(new Error('Solr error'), null);
    });
    app.post('/getProduct')(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith('Internal Server Error');
  });

  it('should handle get request to /', () => {
    const mockRes = { render: jest.fn() };
    app.get('/')(null, mockRes);
    expect(mockRes.render).toHaveBeenCalledWith('search');
  });

  it('should handle get request to /contact', () => {
    const mockRes = { render: jest.fn() };
    app.get('/contact')(null, mockRes);
    expect(mockRes.render).toHaveBeenCalledWith('contact');
  });
});
