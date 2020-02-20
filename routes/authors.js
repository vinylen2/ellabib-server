const router = require('koa-router')({ prefix: '/authors' });
const { Author } = require('../models');

async function getAuthors(ctx) {
  const authors = await Author.findAll();

  ctx.body = {
    data: authors,
    message: 'a message',
  };
}

async function postAuthor(ctx) {
  const { firstname, lastname } = ctx.request.body;
  const author = await Author.create({
    firstname,
    lastname,
  });

  ctx.body = {
    data: author,
    message: 'a message',
  };
}

router.post('/', postAuthor);
router.get('/', getAuthors);

module.exports = router;
