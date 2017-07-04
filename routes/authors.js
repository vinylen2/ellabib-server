const router = require('koa-router')({ prefix: '/authors' });
const { Author } = require('../models');

async function getAuthors(ctx) {
  const authors = await Author.findAll();

  ctx.body = {
    data: authors,
    message: 'a message',
  };
}

router.get('/', getAuthors);

module.exports = router;
