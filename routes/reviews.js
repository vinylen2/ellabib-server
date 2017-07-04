const router = require('koa-router')({ prefix: '/reviews' });
const { Review } = require('../models');

async function getReviewsFromBook(ctx) {
  const { slug } = ctx.request.query;
  const allReviewsFromBook = await Review.findAll({
    where: { slug },
    attributes: [
      'rating',
      'views',
      'description',
      'descriptionAudioUrl',
      'review',
      'reviewAudioUrl',
    ],

  });

  ctx.body = {
    data: allReviewsFromBook,
    message: 'a message',
  };
}

router.get('/', getReviewsFromBook);

module.exports = router;
