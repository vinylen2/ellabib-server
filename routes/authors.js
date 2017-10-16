const router = require('koa-router')({ prefix: '/authors' });
const { Author } = require('../models');

async function authAdmin(ctx, next) {
  try {
    if (cookie.parse(ctx.header.cookie).admin) {
      await next();
    }
  } catch (e) {
    ctx.status = 403;
  }
}

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
  console.log(firstname, lastname);
  const author = await Author.create({
    firstname,
    lastname,
  });

  ctx.body = {
    data: author,
    message: 'a message',
  };
}

router.post('/', authAdmin, postAuthor);
router.get('/', getAuthors);

module.exports = router;
