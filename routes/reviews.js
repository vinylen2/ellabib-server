const router = require('koa-router')({ prefix: '/reviews' });
const busboy = require('koa-busboy');
const Promise = require('bluebird');
const cookie = require('cookie');
const _ = require('lodash');
const { Review, Reviewer, Book, connection } = require('../models');
const uuidv4 = require('uuid/v4');

const uploader = busboy({
  dest: '/var/www/html/audio',
  fnDestFilename: (fieldname, filename) => `${filename}-${uuidv4()}-${fieldname}.mp3`,
});

async function authAdmin(ctx, next) {
  try {
    if (cookie.parse(ctx.header.cookie).admin) {
      await next();
    }
  } catch (e) {
    ctx.status = 403;
  }
}

async function authIp(ctx, next) {
  try {
    if (cookie.parse(ctx.header.cookie).publishReview || cookie.parse(ctx.header.cookie).admin) {
      await next();
    }
  } catch (e) {
    console.log(e);
    ctx.status = 403;
  }
}

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
  console.log('got here');
  const { description, review, reviewerId, bookId, rating } = ctx.request.body;
  const files = ctx.request.files;

  let descriptionAudioUrl;
  let reviewAudioUrl;

  if (files) {
    files.forEach((object) => {
      const fileName = _.last(object.path.split('/'));
      if (object.fieldname === 'descriptionRecording') {
        descriptionAudioUrl = fileName;
      }
      if (object.fieldname === 'reviewRecording') {
        reviewAudioUrl = fileName;
      }
    });
  }

  const book = await Book.findById(bookId);
  const reviewer = await Reviewer.findById(reviewerId);
  const publishedReview = await Review.create({
    description,
    descriptionAudioUrl,
    reviewAudioUrl,
    review,
    rating,
    active: false,
  });

  publishedReview.addReviewers(reviewer);
  publishedReview.addBooks(book)

  ctx.body = {
    data: publishedReview,
    message: 'a message',
  };
}


/**
 * @api {patch} /reviews Activates selected Review
 * @apiName activateReview
 * @apiGroup Reviews
 * @apiParamExample {json} Request-Example:
 *
 * {
 *  "id": 1,
  }
 *
 * @apiParam {Number} id Unique ID of Review to activate
 *
 *
 * @apiSuccessExample Success-respone:
 *    HTTP/1.1 200 OK
      {
      "data": {
        "active": true,
      },
      "message": "Review activated"
    }
 *
 */
async function activateReviews(ctx) {
  const { reviews } = ctx.request.body;

  const activatedReviews = await Promise.all(reviews.map(async (element) => {
    let entry = await Review.findById(element.id);
    let { description, review } = element;
    return entry.update({ active: true, description, review });
  }));

  const updatedRatings = await Promise.all(reviews.map(async (element) => {
    const bookId = element.books[0].id;
    const ratingQuery = await connection.query(`
      SELECT books.*, AVG(reviews.rating) as rating
      FROM books
      INNER JOIN BookReview ON BookReview.bookId = books.id
      INNER JOIN reviews on BookReview.reviewId = reviews.id
      WHERE books.id = ${bookId}
    `);
    const rating = _.uniqBy(_.flatten(ratingQuery), 'id')[0].rating;
    const book = await Book.findById(bookId);
    return book.update({ rating });
  }));

  ctx.body = {
    data: activatedReviews,
    message: 'Succeeded',
  };
}

async function editReviewAudio(ctx) {
  const { reviewId } = ctx.request.body;
  const files = ctx.request.files;

  let descriptionAudioUrl;
  let reviewAudioUrl;

  files.forEach((object) => {
      const fileName = _.last(object.path.split('/'));
      if (object.fieldname === 'descriptionRecording') {
        descriptionAudioUrl = fileName;
      }
      if (object.fieldname === 'reviewRecording') {
        reviewAudioUrl = fileName;
      }
  });

  const reviewData = await Review.findById(reviewId);
  // insert reloacting old audiofiles here.
  console.log(reviewData);

  const editedReview = reviewData.update({
    descriptionAudioUrl,
    reviewAudioUrl,
  });

  ctx.body = {
    data: editedReview,
    message: 'Succeeded',
  };
}

/**
 * @api {get} /inactive Get all inactive Reviews
 * @apiName getInactiveReviews
 * @apiGroup Reviews
 * @apiExample {curl} Example usage:
 * curl -i http://localhost/8000/reviews/inactive
 *
 * @apiSuccess {String} slug URL-friendly title of the Book
 * @apiSuccess {Number} views Amount of views of Book
 *
 * @apiSuccessExample Success-respone:
 *    HTTP/1.1 200 OK
      {
      "data": [
        {
          "active": false,
          "createdAt": "2017-07-25T10:34:43.000Z",
          "createdAt": "2017-07-25T10:34:43.000Z",
          "description": "",
          "descriptionAudioUrl": "audio/fantasyboken-a7b906c6-7c1b-4a8d-81cd-c39b792ea9c3-descriptionRecording.mp3",
          "id": 49,
          "rating": 0,
          "review": "",
          "reviewAudioUrl": null,
          "updatedAt": "2017-07-25T10:34:43.000Z",
          "views": null,
          books: [
            {
              "createdAt": "2017-07-04T15:09:48.000Z",
              "id": 1,
              "imageUrl": "tidningsmysteriet.jpg",
              "isbn": 9780141043029,
              "pages": 20,
              "rating": 5,
              "slug": "tidningsmysteriet",
              "title": "Tidningsmysteriet",
              "updatedAt": "2017-07-04T15:09:48.000Z",
              "views": null
            }
          ]
        }
      ],
      "message": "Review activated"
    }
 *
 */
async function getInactiveReviews(ctx) {
  const inactiveReviews = await Review.findAll({
    where: {
      active: false,
    },
    include: [
      { model: Book, exclude: ['createdAt', 'updatedAt'] },
    ],
  });

  ctx.body = {
    data: inactiveReviews,
    message: 'All inactivated reviews',
  };
}

async function getReviewCount(ctx) {
  const allActiveReviews = await Review.count({
    where: {
      active: true,
    },
  });

  ctx.body = {
    data: allActiveReviews,
    message: 'Number of active reviews.',
  };
}

router.patch('/', authAdmin, activateReviews);
router.patch('/audio/edit', authAdmin, uploader, editReviewAudio);
router.post('/', authIp, uploader, publishReview);
router.get('/id/:id', getReviewsFromBook);
router.get('/count', getReviewCount);
router.get('/inactive', authAdmin, getInactiveReviews);

module.exports = router;
