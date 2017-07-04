const router = require('koa-router')({ prefix: '/books' });
const Promise = require('bluebird');
// const _ = require('lodash');
const { Book, Genre } = require('../models');

async function getAllBooks(ctx) {
  const querystring = ctx.request.query;


  const books = await (() => {
    if ('genre' in querystring) {
      return Promise
        .all(querystring.genre.map(id => Genre.findById(id)))
        .map(genre => genre.getBooks());
    }

    return Book.findAll();
  })();

  // if books get several genres uncomment this
  // _.uniqBy(_.flatten(books), 'id');

  ctx.body = {
    data: books,
    total: books.length,
    message: 'a message',
  };
}

router.get('/', getAllBooks);

module.exports = router;
