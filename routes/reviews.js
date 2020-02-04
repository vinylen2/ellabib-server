const router = require('koa-router')({ prefix: '/reviews' });
const busboy = require('koa-busboy');
const Promise = require('bluebird');
const cookie = require('cookie');
const _ = require('lodash');
const moment = require('moment');
const { Review, User, Book } = require('../models');
const uuidv4 = require('uuid/v4');
const fs = require('fs');
const { promisify } = require('util');
const unlink = promisify(fs.unlink);

const filedest = '/var/www/html/audio';
// const filedest = '/Users/gabriel/ellabib_audio';

const uploader = busboy({
  dest: filedest,
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
        where: { active: true, simple: false, },
        as: 'reviews',
        include: [
          { model: User },
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
  const { description, review, bookId, rating, userId } = ctx.request.body;
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
  const user = await User.findById(userId);
  const publishedReview = await Review.create({
    description,
    descriptionAudioUrl,
    reviewAudioUrl,
    review,
    rating,
    active: false,
    simple: false,
  });

  publishedReview.addUsers(user);
  publishedReview.addBooks(book).then();

  ctx.body = {
    data: publishedReview,
    message: 'a message',
  };
}

async function publishSimpleReview(ctx) {
  const { rating, bookId, userId } = ctx.request.body;

  const book = await Book.findById(bookId);
  const user = await User.findById(userId);

  const review = await Review.create({
    rating,
    active: true,
    simple: true,
  });

  review.addUsers(user);
  review.addBooks(book).then(() => {
    Book.updateRating(book, Review, bookId);
  });

  Book.increment({readCount: 1}, { where: { id: bookId }});

  ctx.body = {
    data: review,
    message: 'Betyg publicerat!',
  };
};


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
  const reviews = ctx.request.body;

  const activatedReviews = await Promise.all(reviews.map(async (id) => {
    let entry = await Review.findById(id);
    return entry.update({ active: true });
  }));

  const updatedRatings = await Promise.all(reviews.map(async (id) => {
    const book = await Book.findAll({
      include: [
        { model: Review,
          where: { id, },
          as: 'reviews',
        },
      ],
    });
    const bookId = book[0].id;
    Book.updateRating(book[0], Review, bookId);
    return true;
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
  // insert relocating old audiofiles here.
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
  moment.locale('sv');
  const inactiveReviews = await Review.findAll({
    where: {
      active: false,
      deleted: false,
    },
    include: [
      { model: Book, exclude: ['createdAt', 'updatedAt'] },
    ],
  });

  inactiveReviews.forEach((review) => {
    review.dataValues.title = review.books[0].title;
    review.dataValues.slug = review.books[0].slug;
    review.dataValues.date = moment(review.createdAt).format('DD/MM-YY');
    review.dataValues.time = moment(review.createdAt).format('hh:mm');
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

async function incrementReviewPlay(ctx) {
  const { reviewId, type } = ctx.request.body;
  const reviewToIncrement = await Review.findById(reviewId);

  if (type === 'review') {
    const value = reviewToIncrement.reviewPlays + 1;
    const incrementedReview = await reviewToIncrement.update({
      reviewPlays: value,
    });
    return true;
  }
  const value = reviewToIncrement.descriptionPlays + 1;
  const incrementedReview = await reviewToIncrement.update({
    descriptionPlays: value,
  });

  ctx.body = {
    data: incrementedReview,
  };
}

async function updateReviewRating(ctx) {
  const { reviewId, rating } = ctx.request.body;
  const reviewToUpdate = await Review.findById(reviewId);

  const updatedReview = await reviewToUpdate.update({
    rating
  });

  ctx.body = {
    data: updatedReview,
  };
}

async function updateReviewText(ctx) {
  const { reviewId, type, text } = ctx.request.body;
  const reviewToUpdate = await Review.findById(reviewId);

  let updatedReview;
  if (type === 'review') {
    updatedReview = await reviewToUpdate.update({
      review: text,
    });
  } else {
    updatedReview = await reviewToUpdate.update({
      description: text,
    });
  } 

  ctx.body = {
    data: updatedReview,
  };
}

async function deleteReview(ctx) {
  const { reviewId } = ctx.request.body;
  const review = await Review.findById(reviewId);
  const { descriptionAudioUrl, reviewAudioUrl } = review;

  // try {
  //   await unlink(`/${filedest}/${descriptionAudioUrl}`);
  // } catch (e) {
  //   console.log(e.code);
  // }

  // try {
  //   await unlink(`/${filedest}/${reviewAudioUrl}`);
  // } catch (e) {
  //   console.log(e.code);
  // }

  const deleted = await review.update({
    active: false,
    deleted: true,
  });
  // const deleted = await reviewToDelete.destroy();

  ctx.body = {
    data: {
      deleted,
    },
  };
}

async function updateRating() {
  Book.increment({readCount: 1}, { where: { id: 5 }});

};

router.patch('/audio/edit', authAdmin, uploader, editReviewAudio);
router.patch('/increment', incrementReviewPlay);
router.post('/', uploader, publishReview);
router.post('/simple', publishSimpleReview);
router.get('/id/:id', getReviewsFromBook);
router.get('/count', getReviewCount);
router.get('/update', updateRating);

// dev routes
// router.patch('/delete', deleteReview);
// router.patch('/', activateReviews);
// router.patch('/rating', updateReviewRating);
// router.patch('/text', updateReviewText);
// router.get('/inactive', getInactiveReviews);

// sharp routes
router.patch('/delete', authAdmin, deleteReview);
router.patch('/', authAdmin, activateReviews);
router.patch('/rating', authAdmin, updateReviewRating);
router.patch('/text', authAdmin, updateReviewText);
router.get('/inactive', authAdmin, getInactiveReviews);
module.exports = router;
