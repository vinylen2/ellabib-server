const router = require('koa-router')({ prefix: '/books' });
const Promise = require('bluebird');
const _ = require('lodash');
const axios = require('axios');
const cookie = require('cookie');
const slugify = require('slugify');
const { Book, Genre, Author, Review, User } = require('../models');
const bokInfoApi = require('../config.json').bokInfo;
const onix = require('onix');
const onixGetters = require('./assets/onix-getters.js');

async function authAdmin(ctx, next) {
  try {
    if (cookie.parse(ctx.header.cookie).admin) {
      await next();
    }
  } catch (e) {
    ctx.status = 403;
  }
}

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


/**
 * @api {get} /books Get all books
 * @apiName getBooks
 * @apiGroup Books
 * @apiExample {curl} Example usage:
 * curl -i http://localhost/8000/books?genre=:genreId,genreId
 *
 * @apiParam {String} genre Query for books by genre
 * @apiParam {Number} genreId ID of the genre to query for separated by commas.
 *
 * @apiSuccess {Array} data Array containing all books
 * @apiSuccess {String} title Title of the Book
 * @apiSuccess {String} slug URL-friendly title of the Book
 * @apiSuccess {Number} views Amount of views of Book
 * @apiSuccess {Number} pages Amount of pages
 * @apiSuccess {String} imageUrl Path to image
 * @apiSuccess {Number} rating Rating of the Book
 *
 * @apiSuccessExample Success-respone:
 *    HTTP/1.1 200 OK
      {
      "data": [
        {
          "title": "A new book",
          "slug": "a-new-book",
          "views": null,
          "pages": 52,
          "imageUrl": "/path/to/image",
          "rating": null,
          "id": 12
        },
        {
          "title": "Another book",
          "slug": "another-book",
          "views": null,
          "pages": 52,
          "imageUrl": "/path/to/image2",
          "rating": null,
          "id": 13
        },
    ],
      "message": "a message"
    }
 *
 */
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

/**
 * @api {get} /books Search for books
 * @apiName searchBooks
 * @apiGroup Books
 * @apiExample {curl} Example usage:
 * curl -i http://localhost/8000/books/search?query=:word
 *
 * @apiParam {String} query Create query of books
 * @apiParam {Number} word Word to search for
 *
 * @apiSuccess {Array} data Array containing all books that matches the query
 * @apiSuccess {String} title Title of the Book
 * @apiSuccess {String} slug URL-friendly title of the Book
 * @apiSuccess {Number} views Amount of views of Book
 * @apiSuccess {Number} pages Amount of pages
 * @apiSuccess {String} imageUrl Path to image
 * @apiSuccess {Number} rating Rating of the Book
 *
 * @apiSuccessExample Success-respone:
 *    HTTP/1.1 200 OK
      {
      "data": [
        {
          "title": "A new book",
          "slug": "a-new-book",
          "views": null,
          "pages": 52,
          "imageUrl": "/path/to/image",
          "rating": null,
          "id": 12
        },
        {
          "title": "Another book",
          "slug": "another-book",
          "views": null,
          "pages": 52,
          "imageUrl": "/path/to/image2",
          "rating": null,
          "id": 13
        },
    ],
      "message": "a message"
    }
 *
 */
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

/**
 * @api {get} /books/id/:id Get book from ID
 * @apiName getBook
 * @apiGroup Books
 * @apiExample {curl} Example usage:
 * curl -i http://localhost/8000/book/id/12
 * @apiParam {String} id Books unique ID.
 *
 * @apiSuccess {String} title Title of the Book
 * @apiSuccess {String} slug URL-friendly title of the Book
 * @apiSuccess {Number} views Amount of views of Book
 * @apiSuccess {Number} pages Amount of pages
 * @apiSuccess {String} imageUrl Path to image
 * @apiSuccess {Number} rating Rating of the Book
 * @apiSuccess {Array} genre Array containing all genres of the Book
 * @apiSuccess {Array} author Array containing all authors of the Book
 *
 * @apiSuccessExample Success-respone:
 *    HTTP/1.1 200 OK
      {
      "data": {
        "title": "A new book",
        "slug": "a-new-book",
        "views": null,
        "pages": 52,
        "imageUrl": "/path/to/image",
        "rating": null,
        "id": 12
        "genres": [
          {
          "id": 1,
           "slug": "deckare",
           "name": "Deckare",
           "createdAt": null,
           "updatedAt": null,
           "BookGenre": {
             "createdAt": "2017-07-04T15:04:49.000Z",
             "updatedAt": "2017-07-04T15:04:49.000Z",
             "bookId": 1,
             "genreId": 1
           }
         ],
        "authors": [
          "id": 1,
          "firstname": "Gabriel",
          "lastname": "Wallén",
          "createdAt": "2017-07-12T12:02:16.000Z",
          "updatedAt": "2017-07-12T12:02:16.000Z",
          "BookAuthor": {
            "createdAt": "2017-07-04T15:09:48.000Z",
            "updatedAt": "2017-07-04T15:09:48.000Z",
            "authorId": 1,
            "bookId": 1
          }
        ]
      },
      "message": "a message"
    }
 *
 */
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

  // const book = await Book.findById(bookId);
  // const genre = await book.getGenres({
  //   attributes: { exclude: ['createdAt', 'updatedAt', 'BookGenre'] },
  // });
  // const author = await book.getAuthors();
  //
  // book.dataValues.genre = genre;
  // book.dataValues.author = author;

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
/**
 * @api {get} /books/slug/:slug Get book from slug
 * @apiName getBookFromSlug
 * @apiGroup Books
 * @apiExample {curl} Example usage:
 * curl -i http://localhost/8000/book/slug/deckarboken
 * @apiParam {String} slug Books unique slug
 *
 * @apiSuccess {String} title Title of the Book
 * @apiSuccess {String} slug URL-friendly title of the Book
 * @apiSuccess {Number} views Amount of views of Book
 * @apiSuccess {Number} pages Amount of pages
 * @apiSuccess {String} imageUrl Path to image
 * @apiSuccess {Number} rating Rating of the Book
 * @apiSuccess {Array} genre Array containing all genres of the Book
 * @apiSuccess {Array} author Array containing all authors of the Book
 * @apiSuccess {Array} reviews Array containing all active reviews of the Book
 *
 * @apiSuccessExample Success-respone:
 *    HTTP/1.1 200 OK
      {
      "data": {
        "title": "A new book",
        "slug": "a-new-book",
        "views": null,
        "pages": 52,
        "imageUrl": "/path/to/image",
        "rating": null,
        "id": 12
        "genres": [
          {
          "id": 1,
           "slug": "deckare",
           "name": "Deckare",
           "createdAt": null,
           "updatedAt": null,
           "BookGenre": {
             "createdAt": "2017-07-04T15:04:49.000Z",
             "updatedAt": "2017-07-04T15:04:49.000Z",
             "bookId": 1,
             "genreId": 1
           }
         ],
        "authors": [
          "id": 1,
          "firstname": "Gabriel",
          "lastname": "Wallén",
          "createdAt": "2017-07-12T12:02:16.000Z",
          "updatedAt": "2017-07-12T12:02:16.000Z",
          "BookAuthor": {
            "createdAt": "2017-07-04T15:09:48.000Z",
            "updatedAt": "2017-07-04T15:09:48.000Z",
            "authorId": 1,
            "bookId": 1
          }
        ]
      },
      "message": "a message"
    }
 *
 */
async function getBookFromSlug(ctx) {
  const slug = ctx.params.slug;

  try {
    const book = await Book.findAll({
      where: { slug },
      include: [
        { model: Genre, as: 'genres' },
        { model: Author, as: 'authors' },
        { model: Review,
          where: { active: true, simple: false, },
          as: 'reviews',
          required: false,
          // include: [
          //   { model: User },
          // ],
        },
      ],
    });

    ctx.status = 200;
    ctx.body = {
      data: book[0],
      message: 'Success',
    };
  } catch (e) {
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
  const allActiveReviews = await Review.count({
    where: {
      active: true,
    },
  });

  const allBooks = await Book.count();

  ctx.body = {
    data: {
      books: {
        count: allBooks,
      },
      reviews: {
        count: allActiveReviews,
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


async function cleanUp(ctx) {
  const books = await Book.findAll();
  const API = axios.create({
    baseURL: bokInfoApi.url,
    headers: {'Ocp-Apim-Subscription-Key': bokInfoApi.key},
  });

  // const bookInfo = await API.get(`/get/9789162271527`);
  // const feed = onix.parse(bookInfo.data, '3.0');

  // books.forEach(async (book) => {
  //   const bookInfo = await API.get(`/get/${book.dataValues.isbn}`);
  //   const feed = onix.parse(bookInfo.data, '3.0');
  //   book.update({ description: onixGetters.getDescription(feed)});
  // });

  ctx.body = {
    item: 'stuff'
    // feed,
    // data,
    // result,
  };
}

// fix this function!
async function isReviewed(ctx) {
  const { slug, userId } = ctx.params;

  const book = await Book.findAll({
    where: { slug },
    include: [
      { model: Review,
        where: { active: true },
        as: 'reviews',
        include: [
          { 
            required: true,
            model: User,
            where: {
              id: userId,
            }
            // id: userId,
          },
        ],
      },
    ],
  });

  let isReviewedByUser = false;
  if (book.length > 0) {
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

router.patch('/edit/', authAdmin, editBook);
router.get('/id/:id', getBook);
router.get('/isbn/:isbn', getBookFromIsbn);
router.get('/slug/:slug', getBookFromSlug);
router.get('/', getAllBooks);
router.get('/recently/reviewed', getRecentlyReviewedBooks);
router.get('/highest', getHighestRatedBooks);
router.get('/search', searchForBooks);
router.get('/count', getCount);
router.get('/cleanup', cleanUp);
router.get('/genre/:genre/search', searchForBooksWithGenre);
router.get('/reviewed/:slug/:userId', isReviewed);

router.get('/read/:id', getBooksReadById);

module.exports = router;
