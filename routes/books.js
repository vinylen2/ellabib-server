const router = require('koa-router')({ prefix: '/books' });
const Promise = require('bluebird');
const _ = require('lodash');
const axios = require('axios');
const { Book, Genre, Author, Review, Reviewer } = require('../models');
const bokhavetApi = require('../config.json').bokhavetApi;

function slugify(text) {
  return text.toString().toLowerCase()
  .replace(/\s+/g, '-')           // Replace spaces with -
  .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
  .replace(/\-\-+/g, '-')         // Replace multiple - with single -
  .replace(/^-+/, '')             // Trim - from start of text
  .replace(/-+$/, '');            // Trim - from end of text
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
  const queryObject = ctx.request.query;
  let offset = 0;
  let queries = {};
  let limit = 40;

  if ('genre' in queryObject) {
    queries.genre = queryObject.genre[0].split(',');
    // if (queries.genre.length > 1) {
    //   limit = parseInt(limit / queries.genre.length);
    // }
  }
  if ('offset' in queryObject) {
    offset = parseInt(queryObject.offset);
  }

  const rawBooks = await (() => {
    if ('genre' in queries) {
      return Promise
        .all(queries.genre.map(id => Genre.findById(id)))
        .map(genre => genre.getBooks({
          limit,
          offset,
        }));
    }

    return Book.findAndCountAll({
      limit,
      offset,
      attributes: {
        exclude: ['updatedAt'],
      },
    });
  })();

  let books;
  let totalCount;

  if ('genre' in queryObject) {
    console.log(queries.genre);
    const allGenreBooks = await(() => {
      return Promise
        .all(queries.genre.map(id => Genre.findById(id)))
        .map(genre => genre.getBooks({
        }));
    })();
    books = _.flattenDeep(rawBooks);
    totalCount = _.flattenDeep(allGenreBooks).length;
  } else {
    totalCount = rawBooks.count;
    books = rawBooks.rows;
  }
  const flattenedBooks = _.uniqBy(_.flatten(books), 'id');
  const range = {
    start: offset + 1,
    last: offset + books.length,
    total: totalCount,
    limit: limit,
  };

  ctx.body = {
    data: books,
    range,
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
  const queryArray = ctx.request.query;
  console.log(queryArray);
  const books = await (() => {
    const genreQuery = Promise
      .all(queryArray.query.map(query => Genre.findAll({
        where: { name: query },
        include: [{
          model: Book,
        }],
      })));

    const authorQuery = Promise
      .all(queryArray.query.map(query => Author.findAll({
        where: { firstname: query },
        include: [{
          model: Book,
        }],
      })));

    const titleQuery = Promise
      .all(queryArray.query.map(query => Book.findAll({
        where: { title: query },
      })));

    return Promise.all([genreQuery, authorQuery, titleQuery]);
  })();

  const flattenedArray = _.flattenDeep(books);
  const arrayOfBooks = flattenedArray.map((entry) => {
    if (entry.books) {
      return entry.books;
    }
    return entry;
  });
  const arrayOfUniqueBooks = _.uniqBy(_.flatten(arrayOfBooks), 'id');

  // console.log(newly[0].books);

  ctx.body = {
    data: arrayOfUniqueBooks,
    message: 'a message',
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

  // const slug = slugify(title);
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

  publishedBook[0].dataValues.genre = genre.dataValues;
  publishedBook[0].dataValues.author = author.dataValues;

  ctx.body = {
    data: publishedBook,
    message: 'a message',
  };
}


async function publishBookFromIsbn(ctx) {
  const { isbn, genreId } = ctx.request.body;

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
      imageUrl = apiData.image;
    } else if (apiData.external_image) {
      imageUrl = apiData.external_image;
    } else {
      imageUrl = "nopicture.png";
      localImage = true;
    }

    console.log(typeof(isbn));
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

    ctx.body = {
      data: book[0],
      added: true,
      message: 'a message',
    };

  } catch (e) {
    ctx.body = {
      added: false,
      message: 'No book for ISBN',
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
    // book.dataValues.genre = genre;
    // book.dataValues.author = author;

    ctx.body = {
      data: book[0],
      message: 'a message',
    };
  } catch (e) {
    ctx.body = {
      data: e,
      message: 'failed',
    };
  }
}

router.post('/publish/manual', publishBookManually);
router.post('/publish/isbn', publishBookFromIsbn);
router.get('/id/:id', getBook);
router.get('/slug/:slug', getBookFromSlug);
router.get('/', getAllBooks);
router.get('/search', searchForBooks);

module.exports = router;
