const router = require('koa-router')({ prefix: '/book' });
const { Book, Genre, Author } = require('../models');

async function publishBook(ctx) {
  // add ISBN from request
  const { title, pages, imageUrl, genreId, authorId } = ctx.request.body;

  // make slug generator from title
  const genre = await Genre.findById(genreId);
  const author = await Author.findById(authorId);

  // add slug ISBN to created book
  const publishedBook = await Book.create({
    title,
    pages,
    imageUrl,
  });

  publishedBook.setGenres(genre);
  publishedBook.setAuthors(author);

  ctx.body = {
    data: publishedBook,
    message: 'a message',
  };
}

async function getBook(ctx) {
  const querystring = ctx.request.query;
  const book = await Book.findById(querystring.id[0]);

  ctx.body = {
    data: book,
    message: 'a message',
  };
}

router.post('/', publishBook);
router.get('/', getBook);

module.exports = router;
