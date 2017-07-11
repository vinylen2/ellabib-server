const router = require('koa-router')({ prefix: '/author' });
const { Author } = require('../models');

async function postAuthor(ctx) {
  const { name } = ctx.request.body;
  const author = await Author.create({
    name,
  });

  ctx.body = {
    data: author,
    message: 'a message',
  };
}

// should be moved to books
// async function getAuthor(ctx) {
//   const authorId = ctx.request.query;
//   const author = await Author.findById(authorId);
//
//   ctx.body = {
//     data: author,
//     message: 'a message',
//   };
// }

router.post('/', postAuthor);

module.exports = router;