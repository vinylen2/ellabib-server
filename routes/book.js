const router = require('koa-router')({ prefix: '/book' });
const { Book } = require('../models');

async function publishBook(ctx) {
  const { title, pages, pictureUrl } = ctx.request.body;
  const publishedBook = await Book.create({
    title,
    pages,
    pictureUrl,
  });

  ctx.body = {
    data: publishedBook,
    message: 'a message',
  };
}

async function getBook(ctx) {
  const querystring = ctx.request.query;
  // const book = await Book.findById(querystring.id[0]);
  //
  // ctx.body = {
  //   data: book,
  //   message: 'a message',
  // };
}

router.post('/publish', publishBook);
router.get('/', getBook);

module.exports = router;
