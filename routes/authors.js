const router = require('koa-router')({ prefix: '/authors' });
const { Author } = require('../models');

/**
 * @api {get} /authors Get all Authors
 * @apiName getAuthors
 * @apiGroup Authors
 *
 * @apiSuccess {String} firstname Firstname of the Author.
 * @apiSuccess {String} lastname Lastname of the Author.
 *
 * @apiSuccessExample Success-respone:
 *    HTTP/1.1 200 OK
      {
      "data": [
        {
          "firstname": "John",
          "lastname": "Doe"
        },
        {
          "firstname": "Another",
          "lastname": "Author",
        }
      ],
      "message": "a message"
    }
 *
 */
async function getAuthors(ctx) {
  const authors = await Author.findAll();

  ctx.body = {
    data: authors,
    message: 'a message',
  };
}

/**
 * @api {post} /authors Post new Author
 * @apiName getAuthor
 * @apiGroup Authors
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
router.get('/', getAuthors);

module.exports = router;
