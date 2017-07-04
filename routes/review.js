const router = require('koa-router')({ prefix: '/review' });
const { Book, Review, Reviewer } = require('../models');

async function postReview(ctx) {
  const { description, review, reviewerId, bookId } = ctx.request.body;
  const book = await Book.findById(bookId);
  const reviewer = await Reviewer.findById(reviewerId);
  const publishedReview = await Review.create({
    description,
    review,
  });

  publishedReview.addReviewers(reviewer);
  publishedReview.addBooks(book);

  ctx.body = {
    data: publishedReview,
    message: 'a message',
  };
}

async function getReviewFromBook(ctx) {
  const { slug, reviewId } = ctx.request.query;

  // ctx.body = {
  //   data:
  // };
}

router.post('/', postReview);

module.exports = router;
