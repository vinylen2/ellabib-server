const Koa = require('koa');
const router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const config = require('./config.json');
const cors = require('koa2-cors');

const models = require('./models');

const app = new Koa();
require('koa-qs')(app, 'strict');


// Set up body parsing middleware
app.use(bodyParser());

// Multer for parsing of multipart/form-data
// app.use(multer());

// Enable CORS
app.use(cors());

// Require the Router defined in words.js
const books = require('./routes/books.js');
const authors = require('./routes/authors.js');
const reviews = require('./routes/reviews.js');
const genres = require('./routes/genres.js');

app.listen(config.port);

models.connection.sync({alter: true}).then(() => {
  console.log(`Server listening on port: ${config.port}`);
  console.log('Sequelize synchronized');
  app.use(books.routes());
  app.use(genres.routes());
  app.use(authors.routes());
  app.use(reviews.routes());
});
