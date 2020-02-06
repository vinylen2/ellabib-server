const Koa = require('koa');
const router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const config = require('./config.json');
const cors = require('koa2-cors');
const models = require('./models');
const session = require('koa-session2');

const app = new Koa();
require('koa-qs')(app, 'strict');

app.keys = ['secret', config.secret];
app.proxy = true;

// Set up body parsing middleware
app.use(bodyParser());
app.use(session());


// Enable CORS
app.use(cors({
  origin: 'http://localhost:8080',
  // origin: 'http://169.254.114.44:8080',
  credentials: true,
  allowMethods: ['GET', 'PATCH', 'POST'],
  allowHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
}));

// Require the Router defined in words.js
const auth = require('./routes/auth.js');
const books = require('./routes/books.js');
const authors = require('./routes/authors.js');
const reviews = require('./routes/reviews.js');
const genres = require('./routes/genres.js');
const user = require('./routes/user.js');
const classes = require('./routes/classes.js');
const schoolUnits = require('./routes/schoolUnits.js');

app.listen(config.port);

models.connection.sync().then(() => {
  console.log(`Server listening on port: ${config.port}`);
  console.log('Sequelize synchronized');
  app.use(auth.routes());
  app.use(books.routes());
  app.use(genres.routes());
  app.use(authors.routes());
  app.use(reviews.routes());
  app.use(user.routes());
  app.use(classes.routes());
  app.use(schoolUnits.routes());
});
