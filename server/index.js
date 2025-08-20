var SolrNode = require('solr-node');
const express = require('express');
const bodyParser = require('body-parser');
const port = 3001;
const app = express();

var client = new SolrNode({
  host: 'localhost',
  port: '8983',
  core: 'bhavya',
  protocol: 'http'
});

// var client = new SolrNode({
//   host: 'localhost',
//   port: '8983', 
//   core: 'bhavya1',
//   protocol: 'http'
// });

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static("views"));


app.post('/getProduct', function (req, res) {

  const searchTerm = req.body.name;
  console.log('Search Term:', searchTerm);
  const strQuery = client.query()
    .q("name:" + searchTerm + "* OR college:" + searchTerm + "* OR dept:" + searchTerm + "* OR email:" + searchTerm + "* OR research_areas:" + searchTerm + "* OR website:" + searchTerm + "*")
    .sort('experience', 'asc')
    .rows(100);

  // const strQuery = client.query()
  // .q("name:" + searchTerm + "* OR position:" + searchTerm + "* OR ph.d:" + searchTerm + "* OR department_s_:" + searchTerm + "* OR research_interests:" + searchTerm + "* OR office_address:" + searchTerm + "* OR office_phone:" + searchTerm + "*")
  // .sort('position', 'asc').rows(100);

  client.search(strQuery, function (err, result) {
    if (err) {
      console.log(err);
      return res.status(500).send('Internal Server Error');
    }
    // console.log('Response:', result.response);
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
  console.log(`Server is running at http://localhost:${port}/`);
});
