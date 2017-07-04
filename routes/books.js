const router = require('koa-router')({ prefix: '/books' });
const { Book, Genre } = require('../models');

async function getAllBooks(ctx) {
  let allBooks = [];
  const querystring = ctx.request.query;

  if (Object.keys(querystring).length) {
    if (querystring.genre) {
      allBooks = await Genre
        .findAll({
          where: {
            slug: querystring.genre,
          },
          include: [{
            model: Book,
            through: {
              where: { bookId: 1 },
            },
          }],
        });
    }
  } else {
    allBooks = await Book.findAll();
  }


  ctx.body = {
    data: allBooks,
    total: allBooks.length,
    message: 'a message',
  };
}

router.get('/', getAllBooks);

module.exports = router;
