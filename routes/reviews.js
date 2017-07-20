const router = require('koa-router')({ prefix: '/reviews' });
const { Review, Reviewer, Book } = require('../models');

/**
 * @api {get} /reviews Get all reviews from Book
 * @apiName getReviewsFromBook
 * @apiGroup Reviews
 * @apiExample {curl} Example usage:
 * curl -i http://localhost/8000/reviews/:id
 *
 * @apiParam {Number} id Unique ID of the Book to get Reviews from.
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
          "id": 2,
          "rating": 3,
          "views": null,
          "description": "Beskrivning",
          "descriptionAudioUrl": null,
          "review": "Recension",
          "reviewAudioUrl": null,
          "active": true,
          "createdAt": "2017-07-13T11:29:36.000Z",
          "updatedAt": "2017-07-13T11:29:36.000Z",
          "BookReview": {
            "createdAt": "2017-07-13T11:29:36.000Z",
            "updatedAt": "2017-07-13T11:29:36.000Z",
            "bookId": 4,
            "reviewId": 2
          },
          "reviewers": [
            {
              "id": 1,
              "name": "1a",
              "createdAt": "2017-07-13T00:00:00.000Z",
              "updatedAt": "2017-07-13T00:00:00.000Z",
              "BookReviewer": {
                "createdAt": "2017-07-13T11:29:36.000Z",
                "updatedAt": "2017-07-13T11:29:36.000Z",
                "reviewId": 2,
                "reviewerId": 1
              }
            }
          ]
        },
        { }
      ],
      "message": "a message"
    }
 *
 */
async function getReviewsFromBook(ctx) {
  const bookId = ctx.params.id;
  const allReviewsFromBook = await Book.findAll({
    where: { id: bookId },
    include: [
      { model: Review,
        where: { active: true },
        as: 'reviews',
        include: [
          { model: Reviewer },
        ],
      },
    ],
  });

  // try catch error on empty array
  try {
    const reviews = allReviewsFromBook[0].dataValues.reviews;
    ctx.body = {
      data: reviews,
      message: 'a message',
    };
  } catch (e) {
    ctx.body = {
      data: null,
      message: 'No reviews found',
    };
  }
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

router.post('/', publishReview);
router.get('/id/:id', getReviewsFromBook);

module.exports = router;
