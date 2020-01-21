const router = require('koa-router')({ prefix: '/books' });
const Promise = require('bluebird');
const _ = require('lodash');
const axios = require('axios');
const cookie = require('cookie');
const slugify = require('slugify');
const { Book, Genre, Author, Review, User } = require('../models');
const bokhavetApi = require('../config.json').bokhavetApi;
const bokInfoApi = require('../config.json').bokInfo;
const onix = require('onix');
const parseString = require('xml2js').parseStringPromise;

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
 * @api {post} /books Post new Book
 * @apiName publishBook
 * @apiGroup Books
 * @apiParamExample {json} Request-Example:
 *
 * {
    "title": "A new Book",
    "pages": 52,
    "imageUrl": "/path/to/image",
    "genreId": 1,
    "authorId", 12
  }
 *
 * @apiParam {String} title Title of the Book
 * @apiParam {Number} pages Amount of pages
 * @apiParam {String} imageUrl Path to image
 * @apiParam {Number} genreId GenreID for Genre associated with Book
 * @apiParam {Number} authorId AuthorID for Author associated with Book
 * @apiParam {Number} isbn Unique ISBN number for book, not required
 *
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
      "data": {
        "title": "A new book",
        "slug": "a-new-book",
        "views": null,
        "pages": 52,
        "imageUrl": "/path/to/image",
        "rating": null,
        "id": 12
      },
      "message": "a message"
    }
 *
 */
async function publishBookManually(ctx) {
  let { title, pages, imageUrl, genreId, authorId, isbn } = ctx.request.body;

  const author = await Author.findById(authorId);

  if (!imageUrl) {
    imageUrl: 'nopicture.png';
  }
  // improvements:
  // add support for publishing picture

  const genre = await Genre.findById(genreId);
  const publishedBook = await Book.findOrCreate({
    where : { isbn },
    defaults: {
      title,
      pages,
      imageUrl,
      slug: slugify(title),
      isbn,
    },
  });

  publishedBook[0].setGenres(genre);
  publishedBook[0].setAuthors(author);

  ctx.body = {
    data: publishedBook,
    message: 'a message',
  };
}


async function publishBookFromIsbn(ctx) {
  const { isbn, genreId } = ctx.request.body;
  const adminCookie = ctx.cookies.get('admin');

  try {
    const bokhavetResponse = await axios.get(`${bokhavetApi.url}${isbn}${bokhavetApi.key}`);
    // defining vars for book creation
    if (!bokhavetResponse.data.success) {
      throw('No match on ISBN');
    }
    const apiData = bokhavetResponse.data.data;
    const { title, pages } = apiData;
    const authorArray = apiData.author.split(" ");
    const firstname = authorArray[0];
    const lastname = authorArray[authorArray.length - 1];

    const author = await Author.findOrCreate({
      where : {
        lastname,
        firstname: {
          $like: `%${firstname}%`,
        },
      },
      defaults: {
        firstname,
        lastname,
      },
    });

    const authorId = author[0].id;
    let localImage = false;
    let imageUrl;
    if (apiData.image) {
      imageUrl = apiData.image.replace('http://', 'https://');
    } else if (apiData.external_image) {
      imageUrl = apiData.external_image.replace('http://', 'https://');
    } else {
      imageUrl = "nopicture.png";
      localImage = true;
    }

    const book = await Book.findOrCreate({
      where: { isbn },
      defaults: {
        title,
        pages,
        imageUrl,
        localImage,
        slug: slugify(title),
        isbn,
      }
    });
    const genre = await Genre.findById(genreId);
    book[0].setGenres(genre);
    book[0].setAuthors(author[0]);

    console.log(book);
    if (!book[1]) {
      ctx.body = {
        data: book[0],
        added: false,
        message: 'Boken finns redan',
      };
    } else {
      ctx.body = {
        data: book[0],
        added: true,
        message: 'Bok tillagd',
      };
    }

  } catch (e) {
    ctx.body = {
      status: 400,
      added: false,
      message: 'Hittade ingen bok från ISBN.',
    };
  }
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

  const API = axios.create({
    baseURL: bokInfoApi.url,
    headers: {'Ocp-Apim-Subscription-Key': bokInfoApi.key},
  });

  try {
    const bookInfo = await API.get(`/get/${isbn}`);
    const result = await parseString(bookInfo.data)

    let pages = result.ONIXMessage.Product[0].DescriptiveDetail[0].Extent[0].ExtentValue[0];
    let title = result.ONIXMessage.Product[0].DescriptiveDetail[0].TitleDetail[0].TitleElement[0].TitleText[0];

    let imageUrl = result.ONIXMessage.Product[0].CollateralDetail[0].SupportingResource[0].ResourceVersion[0].ResourceLink[0];
    let description = result.ONIXMessage.Product[0].CollateralDetail[0].TextContent[0].Text[0];

    const author = await findOrCreateAuthor(result.ONIXMessage.Product[0].DescriptiveDetail[0].Contributor[0].NamesBeforeKey[0], result.ONIXMessage.Product[0].DescriptiveDetail[0].Contributor[0].KeyNames[0]);

    ctx.body = {
      data: {
        stuff: result.ONIXMessage.Product[0],
        title,
        description,
        pages,
        imageUrl,
        author,
      },
    };
  }
  catch (e) {
    ctx.body = {
      message: 'Hittade ingen bok.',
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
          where: { active: true },
          as: 'reviews',
          required: false,
          include: [
            { model: User },
          ],
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
  const { bookId, authorId, genreId, title, pages } = ctx.request.body;
  console.log(ctx.request.body);

  try {
    const book = await Book.findById(bookId);
    const genre = await Genre.findById(genreId);
    const author = await Author.findById(authorId);

    const newBook = await book.update({
      title,
      pages,
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
  const imageUrls = [];
  books.forEach((book) => {
    if (book.imageUrl !== 'nopicture.png') {
      imageUrls.push(book.imageUrl);
    }
  });
}

router.post('/publish/manual', authAdmin, publishBookManually);
router.post('/publish/isbn', authAdmin, publishBookFromIsbn);
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

module.exports = router;
