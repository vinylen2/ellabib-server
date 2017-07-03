const Koa = require('koa');
// const router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('koa2-cors');

const models = require('./models');

const app = new Koa();

// Set up body parsing middleware
app.use(bodyParser());

// Enable CORS
app.use(cors());

// Require the Router defined in words.js
// const books = require('./routes/books.js');

app.listen(3000);
console.log('Server listening on port 3000');

models.connection.sync().then(() => {
  console.log('Sequelize synchronized');

  // Use the Router on the sub route /words.js
  // app.use(books.routes());
});
