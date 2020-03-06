const router = require('koa-router')({ prefix: '/genres' });
const { Genre } = require('../models');

async function getGenres(ctx) {
  const genres = await Genre.findAll({
    attributes: { exclude: ['updatedAt', 'createdAt'] },
  });

  ctx.body = {
    data: genres,
  };
}

router.get('/', getGenres);

module.exports = router;
