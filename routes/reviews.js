const router = require('koa-router')({ prefix: '/reviews' });
const { Review } = require('../models');

/**
 * @api {get} /reviews Get all reviews from Book
 * @apiName getReviewsFromBook
 * @apiGroup Reviews
 * @apiExample {curl} Example usage:
 * curl -i http://localhost/8000/reviews/:slug
 *
 * @apiParam {String} slug URL friendly name of book to get reviews from
 *
 * @apiSuccess {Number} rating Rating of the book from Reviewer
 * @apiSuccess {Number} views Amount of views on the Review
 * @apiSuccess {String} description Description of the Book
 * @apiSuccess {String} review Review of the Book
 * @apiSuccess {Number} id Review unique ID
 *
 * @apiSuccessExample Success-respone:
 *    HTTP/1.1 200 OK
      {
      "data": [
        {
          "rating": 4,
          "views": null,
          "description": "The book is about ...",
          "review": "I think the book was ...",
          "id": 1
        },
        {
          "rating": 4,
          "views": null,
          "description": "The book is about ...",
          "review": "I think the book was ...",
          "id": 2
        },
    ],
      "message": "a message"
    }
 *
 */
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

/**
 * @api {post} /reviews Post new Review
 * @apiName publishReview
 * @apiGroup Reviews
 * @apiParamExample {json} Request-Example:
 *
 * {
    "description": "The book is about...",
    "review": "I thought the book was ...",
    "rating": 4,
    "reviewerId": 1,
    "bookId": 2
  }
 *
 * @apiParam {String} description Description of the Book
 * @apiParam {String} review Review of the Book
 * @apiParam {Number} rating Rating of the Book
 * @apiParam {Number} reviewerId Reviewers unique ID
 * @apiParam {Number} bookId Books unique ID
 *
 * @apiParam {String} description Description of the Book
 * @apiParam {String} review Review of the Book
 * @apiParam {Number} rating Rating of the Book
 * @apiParam {Number} reviewerId Reviewers unique ID
 * @apiParam {Number} bookId Books unique ID
 * @apiParam {Number} id Reviews unique ID
 *
 * @apiSuccessExample Success-respone:
 *    HTTP/1.1 200 OK
      {
      "data": {
        "description": "The book is about...",
        "review": "I thought the book was ...",
        "rating": 4,
        "reviewerId": 1,
        "bookId": 2,
        "id": 1
      },
      "message": "a message"
    }
 *
 */
async function publishReview(ctx) {
  const { description, review, reviewerId, bookId, rating } = ctx.request.body;
  const book = await Book.findById(bookId);
  const reviewer = await Reviewer.findById(reviewerId);
  const publishedReview = await Review.create({
    description,
    review,
    rating,
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

router.post('/', publishReview);
router.get('/', getReviewsFromBook);

module.exports = router;
