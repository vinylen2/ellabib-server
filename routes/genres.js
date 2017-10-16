const router = require('koa-router')({ prefix: '/genres' });
const { Genre } = require('../models');

async function authAdmin(ctx, next) {
  try {
    if (cookie.parse(ctx.header.cookie).admin) {
      await next();
    }
  } catch (e) {
    ctx.status = 403;
  }
}

function slugify(text) {
  return text.toString().toLowerCase()
  .replace(/\s+/g, '-')           // Replace spaces with -
  .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
  .replace(/\-\-+/g, '-')         // Replace multiple - with single -
  .replace(/^-+/, '')             // Trim - from start of text
  .replace(/-+$/, '');            // Trim - from end of text
}

/**
 * @api {get} /genres Get all Genres
 * @apiName getGenres
 * @apiGroup Genres
 *
 * @apiSuccess {String} name Name of the Genre
 * @apiSuccess {String} slug Slugified name of the Genre
 * @apiSuccess {Number} id Unique ID of the Genre
 *
 * @apiSuccessExample Success-respone:
 *    HTTP/1.1 200 OK
      {
      "data": [
        {
          "name": "Deckare",
          "slug": "deckare",
          "id": 1
        },
        {
          "name": "Familj och vänner",
          "slug": "familjochvanner",
          "id": 2
        }
      ],
      "message": "a message"
    }
 *
 */
async function getGenres(ctx) {
  const genres = await Genre.findAll({
    attributes: { exclude: ['updatedAt', 'createdAt'] },
  });

  ctx.body = {
    data: genres,
    message: 'a message',
  };
}

/**
 * @api {post} /genres Post new Genre
 * @apiName postGenre
 * @apiGroup Genres
 * @apiParamExample {json} Request-Example:
 *
 * {
    "name": "Deckare"
  }
 *
 * @apiParam {String} name Name of the Genre
 *
 * @apiSuccess {String} name Name of the Genre
 * @apiSuccess {String} slug Slugified name of the Genre
 *
 * @apiSuccessExample Success-respone:
 *    HTTP/1.1 200 OK
      {
      "data": {
        "name": "Deckare",
        "slug": "deckare"
      },
      "message": "a message"
    }
 *
 */

async function postGenre(ctx) {
  const { name } = ctx.request.body;

  const slug = slugify(name);
  const genre = await Genre.create({
    slug,
    name,
  });

  ctx.body = {
    data: genre,
    message: 'a message',
  };
}

router.post('/', authAdmin, postGenre);
router.get('/', getGenres);

module.exports = router;
