const router = require('koa-router')({ prefix: '/author' });
const { Author } = require('../models');

/**
 * @api {post} /author Post new Author
 * @apiName getAuthor
 * @apiGroup Author
 * @apiParamExample {json} Request-Example:
 *
 * {
    "firstname": "John",
    "lastname": "Doe"
  }
 *
 * @apiParam {String} firstname Firstname of the Author
 * @apiParam {String} lastname Lastname of the Author
 *
 * @apiSuccess {String} firstname Firstname of the Author.
 * @apiSuccess {String} lastname Lastname of the Author.
 *
 * @apiSuccessExample Success-respone:
 *    HTTP/1.1 200 OK
      {
      "data": {
        "firstname": "John",
        "lastname": "Doe"
      },
      "message": "a message"
    }
 *
 */

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
