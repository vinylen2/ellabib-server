const Koa = require('koa');
const router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const config = require('./config.json');
const cors = require('koa2-cors');
const models = require('./models');

const errorHandler = require('./middleware/errorHandler');

const app = new Koa();
require('koa-qs')(app, 'strict');

app.proxy = true;

// Set up body parsing middleware
app.use(bodyParser());
// app.use(errorHandler());

const node_env = process.env.NODE_ENV === 'production' ? 'production' : 'development';

const origin = node_env === 'production' ? config.url : 'http://localhost:8080';

// Enable CORS
app.use(cors({
  origin: 'http://localhost:8080',
  // origin,
  credentials: true,
  allowMethods: ['GET', 'PATCH', 'POST'],
  allowHeaders: ['Authorization', 'Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
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
const avatars = require('./routes/avatars.js');
const index = require('./routes/index.js');
let cleanup;

// use only in dev
if (node_env == 'development') {
  cleanup = require('./routes/cleanup.js');
}

app.listen(config.port);

async function state(ctx, next) {
  ctx.state.env = node_env;
  await next();
}

models.connection.sync().then(() => {
  console.log(`Server listening on port: ${config.port}`);
  console.log('Sequelize synchronized');

  app.use(state);

  app.use(auth.routes());
  app.use(books.routes());
  app.use(genres.routes());
  app.use(authors.routes());
  app.use(reviews.routes());
  app.use(user.routes());
  app.use(classes.routes());
  app.use(schoolUnits.routes());
  app.use(avatars.routes());
  app.use(index.routes());

  if (node_env == 'development') {
    app.use(cleanup.routes());
  }
});
