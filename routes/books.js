const router = require('koa-router')({ prefix: '/books' });
const Promise = require('bluebird');
const _ = require('lodash');
const axios = require('axios');
const slugify = require('slugify');
const { Book, Genre, Author, Review, User, Isbn, LibraryId } = require('../models');
const bokInfoApi = require('../config.json').bokInfo;
const gApi = require('../config.json').gapi;
const onix = require('onix');
const onixGetters = require('./assets/onix-getters.js');

const { connection } = require('../models');
const Sequelize = require('sequelize');

function flattenQueries(array) {
  return _.flatten(array.query.map((query) => {
    if (query.includes(" ")) {
      const word = query.split(" ");
      return word;
    } else {
      return query;
    }
  }));
}

function flattenAndUnique(array) {
  const flattenedArray = _.flattenDeep(array);
  const arrayOfBooks = flattenedArray.map((entry) => {
    if (entry.books) {
      return entry.books;
    }
    return entry;
  });
  return _.uniqBy(_.flatten(arrayOfBooks), 'id');
}


async function getAllBooks(ctx) {
  const books = await Book.findAll({
    attributes: {
      exclude: ['updatedAt'],
    },
  });
  // const queryObject = ctx.request.query;
  // let offset = 0;
  // let limit = 100;

  // if ('offset' in queryObject) {
  //   offset = parseInt(queryObject.offset);
  // }

  // const books = await Book.findAndCountAll({
  //     limit,
  //     offset,
  //     attributes: {
  //       exclude: ['updatedAt'],
  //     },
  //   });

  // const range = {
  //   start: offset + 1,
  //   last: books.count,
  //   limit: limit,
  // };

  ctx.body = {
    data: books,
    // range,
    message: 'a message',
  };
}

async function searchForBooks(ctx) {
  const queryArray = flattenQueries(ctx.request.query);

  const books = await (() => {
    const genreQuery = Promise
      .all(queryArray.map(query => Genre.findAll({
        where: { 
          $or: [
            {
              name: { 
                $like: `${query}%`, 
              },
            },
            {
              slug: { 
                $like: `${query}%`, 
              },
            },
          ],
        },
        include: [{
          model: Book,
        }],
      })));

    const authorQuery = Promise
      .all(queryArray.map(query => Author.findAll({
        where: { 
          $or: [
            { 
              firstname: {
                $like: `%${query}%`,
              },
            },
            { 
              lastname: {
                $like: `%${query}%`,
              },
            },
          ],
        },
        include: [{
          model: Book,
        }],
      })));

    const titleQuery = Promise
      .all(queryArray.map(query => Book.findAll({
        where: { 
          title: {
            $like: `%${query}%`,
          },
        },
      })));

    return Promise.all([genreQuery, authorQuery, titleQuery]);
  })();

  ctx.body = {
    data: flattenAndUnique(books),
    message: 'a message',
  };
}

async function searchForBooksWithGenre(ctx) {
  const genre = ctx.params.genre;
  const queryArray = flattenQueries(ctx.request.query);

  const books = await (() => {
    const booksFromGenre = Promise
      .all(queryArray.map(query => Genre.findAll({
          where: { 
            $or: [
              {
                name: genre,
              },
              {
                slug: genre,
              },
            ],
          },
          include: [{
            model: Book,
            where: {
              slug: { 
                $like: `${query}%`, 
              },
            },
          }],
        })));
      
    const booksFromAuthor = Promise
      .all(queryArray.map(query => Author.findAll({
        where: { 
          $or: [
            { 
              firstname: {
                $like: `%${query}%`,
              },
            },
            { 
              lastname: {
                $like: `%${query}%`,
              },
            },
          ],
        },
        include: [{
          model: Book,
          include: [{
            model: Genre,
            where: {
              $or: [
                {
                  name: genre,
                },
                {
                  slug: genre,
                },
              ],
            },
          }],
        }],
      })));
      return Promise.all([booksFromGenre, booksFromAuthor]);
})();

  ctx.body = {
    data: flattenAndUnique(books),
    message: 'hej',
  };
}

async function getBook(ctx) {
  const bookId = ctx.params.id;
  const book = await Book.findAll({
    where: { id: bookId },
    include: [
      { model: Genre, as: 'genres' },
      { model: Author, as: 'authors' },
      { model: Review,
        as: 'reviews',
        include: [
          { model: Reviewer },
        ],
      },
    ],
  });

  ctx.body = {
    data: book[0],
    message: 'a message',
  };
}

async function getBookFromIsbn(ctx) {
  const isbn = ctx.params.isbn;

  const book = await Book.findAll({
    where: {
      isbn,
    },
    include: [
      { model: Genre, as: 'genres' },
      { model: Author, as: 'authors' },
    ],
  });

  if (book.length == 0) {
    try {
      const API = axios.create({
        baseURL: bokInfoApi.url,
        headers: {'Ocp-Apim-Subscription-Key': bokInfoApi.key},
      });

      const bookInfo = await API.get(`/get/${isbn}`);
      const feed = onix.parse(bookInfo.data, '3.0');

      // add support for no resource type
      let imageUrl = onixGetters.getResourceLink(feed);
      let pages = onixGetters.getPages(feed);
      let title = onixGetters.getTitle(feed);
      let originalDescription = onixGetters.getDescription(feed);

      const author = await findOrCreateAuthor(getAuthorFirstname(feed), getAuthorLastname(feed));

      ctx.body = {
        data: {
          title,
          originalDescription,
          pages,
          imageUrl,
          author,
        },
        newBook: true,
      };
    }
    catch (e) {
      ctx.body = {
        data: null,
        message: 'Hittade ingen bok.',
        newBook: false,
      };
    }
  } else {
    ctx.body = {
      data: book[0],
      newBook: false,
    };
  }


  async function findOrCreateAuthor(firstname, lastname) {
      const author = await Author.findOrCreate({
        where: {
          firstname,
          lastname
        },
      })
      return {
        id: author[0].dataValues.id,
        firstname: author[0].dataValues.firstname,
        lastname: author[0].dataValues.lastname,
        fullName: author[0].dataValues.firstname + ' ' + author[0].dataValues.lastname,
        newlyCreated: author[1],
      };
  };
}
async function getBookFromSlug(ctx) {
  const slug = ctx.params.slug;

  try {
    const book = await Book.findAll({
      where: { slug },
      // attributes: [[Sequelize.fn('AVG', Sequelize.col('reviews.rating')), 'bookRating']],
      // group: ['genres.id', 'authors.id', 'reviews.id'],
      include: [
        { model: Genre, as: 'genres' },
        { model: Author, as: 'authors' },
        { model: Review,
          where: { active: true, simple: false, },
          required: false,
          as: 'reviews',
        },
      ],
    });

    ctx.status = 200;
    ctx.body = {
      data: book[0],
      message: 'Success',
    };
  } catch (e) {
    console.log(e);
    ctx.status = e.status || 500;
    ctx.body = {
      message: 'failed',
    };
  }
}

async function getRecentlyReviewedBooks(ctx) {
  const reviews = await Review.findAll({
    where: {
      active: true,
    },
    limit: 10,
    order: [['createdAt', 'DESC']],
    include: [
      { model: Book, as: 'books' },
    ], 
  });

  ctx.body = {
    data: _.uniqBy(_.flatten(_.map(reviews, 'books')), 'id'),
    message:'Success',
  };
}

async function getHighestRatedBooks(ctx) {
  const books = await Book.findAll({
    limit: 5,
    order: [['rating', 'DESC']],
  });

  ctx.body = {
    data: books,
    message: 'Success',
  }
}

async function getCount(ctx) {
  const result = await connection.query(`
    SELECT SUM(B.pages) as pagesRead,
      SUM(R.simple = 0) as reviewsWritten,
      COUNT(R.id) as booksRead
    FROM books B   
      JOIN BookReview Br ON Br.bookId = B.id
      JOIN reviews R ON Br.reviewId = R.id
    WHERE R.active = true;
  `, { type: Sequelize.QueryTypes.SELECT });

  const allBooks = await Book.count();

  ctx.body = {
    data: {
      books: {
        count: allBooks,
      },
      reviews: {
        reviewsWritten: result[0].reviewsWritten,
        booksRead: result[0].booksRead,
        pagesRead: result[0].pagesRead,
      },
    },
    message: 'Number of and active reviews.',
  };
}

async function editBook(ctx) {
  const { bookId, authorId, genreId, title, pages, description } = ctx.request.body;

  try {
    const book = await Book.findById(bookId);
    const genre = await Genre.findById(genreId);
    const author = await Author.findById(authorId);

    const newBook = await book.update({
      title,
      pages,
      description,
    });

    book.setGenres(genre);
    book.setAuthors(author);

    ctx.body = { 
      data: book,
      message: 'Book updated',
    };

  } catch (e) {
    ctx.body = {
      status: 400,
    };
  }
}


const fs = require('fs');


// fix this function!
async function isReviewed(ctx) {
  const { slug, userId } = ctx.params;

  const isReviewed = await connection.query(`
  SELECT U.id
  FROM Users U
    JOIN BookReviewer BRR ON U.id = BRR.userId
    JOIN Reviews R ON BRR.reviewId = R.id
    JOIN BookReview Br ON R.id = Br.reviewId
    JOIN Books B ON Br.bookId = B.id
  WHERE B.slug = (:slug) AND U.id = (:userId);
  `, { replacements: { slug, userId }, type: Sequelize.QueryTypes.SELECT });

  let isReviewedByUser = false;
  if (isReviewed.length > 0) {
    isReviewedByUser = true;
  }
  ctx.status = 200;
  ctx.body = {
    isReviewedByUser,
  };
};

async function getBooksReadById (ctx) {
  const userId = ctx.params.id;

  const books = await Book.findAll({
    include: [
      {
        model: Review,
        required: true,
        include: [
          {
            model: User,
            where: {
              id: userId,
            },
          }
        ],
      },
    ],
  });

  ctx.body = {
    data: books,
  };
};



router.patch('/edit/', editBook);
router.get('/id/:id', getBook);
router.get('/isbn/:isbn', getBookFromIsbn);
router.get('/slug/:slug', getBookFromSlug);
router.get('/', getAllBooks);
router.get('/recently/reviewed', getRecentlyReviewedBooks);
router.get('/highest', getHighestRatedBooks);
router.get('/search', searchForBooks);
router.get('/count', getCount);
router.get('/genre/:genre/search', searchForBooksWithGenre);
router.get('/reviewed/:slug/:userId', isReviewed);
router.get('/read/:id', getBooksReadById);


module.exports = router;
