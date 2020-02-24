const router = require('koa-router')({ prefix: '/reviews' });
const busboy = require('koa-busboy');
const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('moment');
const { Review, User, Book, Isbn } = require('../models');
const uuidv4 = require('uuid/v4');
const fs = require('fs');
const { promisify } = require('util');
const unlink = promisify(fs.unlink);

const { connection } = require('../models');
const Sequelize = require('sequelize');

// const filedest = '/var/www/html/audio';
const filedest = '/Users/gabriel/ellabib_audio';

const uploader = busboy({
  dest: filedest,
  fnDestFilename: (fieldname, filename) => `${filename}-${uuidv4()}-${fieldname}.mp3`,
});


async function getReviewsFromBook(ctx) {
  const slug = ctx.params.slug;
  const reviews = await connection.query(`
    SELECT r.id, r.rating, r.review, r.descriptionAudioUrl, r.reviewAudioUrl, r.updatedAt,
      c.displayName
    FROM reviews r
        JOIN BookReview br ON r.id = br.reviewId
        JOIN books b ON br.bookId = b.id
        JOIN BookReviewer brr ON br.reviewId = brr.reviewId
      JOIN users u ON brr.userId = u.id
        JOIN UserClass uc ON u.id = uc.userId
        JOIN classes c ON uc.classId = c.id
    WHERE b.slug = (:slug) AND r.active AND !r.simple
    ORDER BY r.updatedAt DESC;
  `, { replacements: { slug }, type: Sequelize.QueryTypes.SELECT });

  ctx.body = {
    data: reviews,
  };

}

async function publishReview(ctx) {
  const { review, bookId, rating, userId } = ctx.request.body;
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
    descriptionAudioUrl,
    reviewAudioUrl,
    review,
    rating,
    active: false,
    simple: false,
  });

  publishedReview.addUsers(user);
  publishedReview.addBooks(book);

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

async function getInactiveReviews(ctx) {
  moment.locale('sv');
  const inactiveReviews = await connection.query(`
    SELECT c.displayName as writtenBy, 
      b.title, b.description, b.slug,
      r.review, r.reviewAudioUrl, r.descriptionAudioUrl, r.rating, r.createdAt, r.id
    FROM reviews r
      JOIN BookReviewer brr ON r.id = brr.reviewId
      JOIN users u ON brr.userId = u.id
      JOIN BookReview br ON r.id = br.reviewId
      JOIN books b ON br.bookId = b.id
      JOIN UserClass uc ON u.id = uc.userId
      JOIN classes c ON uc.classId = c.id
    WHERE r.active = false AND r.simple = false;
  `, { type: Sequelize.QueryTypes.SELECT });

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

router.patch('/audio/edit', uploader, editReviewAudio);
router.post('/', uploader, publishReview);
router.post('/simple', publishSimpleReview);
router.get('/slug/:slug', getReviewsFromBook);
router.get('/count', getReviewCount);
router.get('/update', updateRating);

// dev routes
router.patch('/delete', deleteReview);
router.patch('/', activateReviews);
router.patch('/rating', updateReviewRating);
router.patch('/text', updateReviewText);
router.get('/inactive', getInactiveReviews);

// sharp routes
module.exports = router;
