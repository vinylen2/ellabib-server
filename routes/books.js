const router = require('koa-router')({ prefix: '/books' });
const Promise = require('bluebird');
const _ = require('lodash');
const axios = require('axios');
const slugify = require('slugify');
const { Book, Genre, Author, Review, User, Isbn, LibraryId, Class } = require('../models');
const bokInfoApi = require('../config.json').bokInfo;
const gApi = require('../config.json').gapi;
const onix = require('onix');
const onixGetters = require('./assets/onix-getters.js');
const moment = require('moment');

const { connection } = require('../models');
const Sequelize = require('sequelize');

const adminAuthenticated = require('../middleware/adminAuthenticated.js');

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
    include: [
      { 
        model: Isbn,
        where: {
          isbn
        },
      },
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
      let description = onixGetters.getDescription(feed);

      const author = await findOrCreateAuthor(onixGetters.getAuthorFirstname(feed), onixGetters.getAuthorLastname(feed));

      ctx.body = {
        data: {
          title,
          description,
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
  let userId = null;
  let isReviewedByUser = true;

  try {
    const book = await connection.query(`
    SELECT b.title, b.slug, b.id, b.pages, b.description, b.imageUrl,
      COUNT(r.id) as readCount, AVG(r.rating) as rating, 
      MAX(g.slug) as genreSlug, MAX(g.id) as genreId, MAX(g.name) as genreDisplayName,
      MAX(a.id) as authorId, CONCAT(MAX(a.firstname), ' ', MAX(a.lastname)) as author
    FROM books b
        LEFT JOIN BookGenre bg ON b.id = bg.bookId
        LEFT JOIN genres g ON bg.genreId = g.id
        LEFT JOIN BookAuthor ba ON b.id = ba.bookId
        LEFT JOIN authors a ON ba.authorId = a.id
        LEFT JOIN BookReview br ON b.id = br.bookId
        LEFT JOIN reviews r ON br.reviewId = r.id AND r.active
    WHERE b.slug = (:slug) 
    GROUP BY b.id; 
    `, { replacements: { slug } }, { type: Sequelize.QueryTypes.SELECT });

    if (ctx.query.userId && !ctx.query.userId[0] == '') {
      userId = ctx.query.userId[0];
      const isReviewed = await connection.query(`
      SELECT U.id
      FROM users U
        JOIN BookReviewer BRR ON U.id = BRR.userId
        JOIN reviews R ON BRR.reviewId = R.id
        JOIN BookReview Br ON R.id = Br.reviewId
        JOIN books B ON Br.bookId = B.id
      WHERE B.slug = (:slug) AND U.id = (:userId);
      `, { replacements: { slug, userId }, type: Sequelize.QueryTypes.SELECT });
      if (!isReviewed.length > 0) {
        isReviewedByUser = false;
      }
    }

    ctx.body = {
      data: {
        isReviewedByUser,
        book: book[0][0],
      },
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
  const recentlyReviewed = await connection.query(`
    SELECT b.id as bookId, b.slug as bookSlug, b.imageUrl, b.title,
      r.rating, r.id as reviewId, r.updatedAt as publishDate,
      g.id, g.slug as genreSlug,
      c.displayName as classDisplayName,
      a.id as authorId, CONCAT(a.firstname, ' ', a.lastname) as author
    FROM books b
      JOIN BookReview br ON b.id = br.bookId
      JOIN BookReviewer brr ON br.reviewId = brr.reviewId
      JOIN reviews r ON br.reviewId = r.id
      JOIN BookGenre bg ON b.id = bg.bookId
      JOIN genres g ON bg.genreId = g.id
      JOIN users u ON brr.userId = u.id
      JOIN UserClass uc ON u.id = uc.userId
      JOIN classes c ON uc.classId = c.id 
      JOIN BookAuthor ba ON b.id = ba.bookId
      JOIN authors a ON ba.authorId = a.id
    WHERE r.active
    ORDER BY r.updatedAt ASC
    LIMIT 5;
  `, { type: Sequelize.QueryTypes.SELECT });

  ctx.body = {
    data: recentlyReviewed,
  };
}

async function getHighestRatedBooks(ctx) {
  const books = await connection.query(`
    SELECT b.id as bookId, b.slug as bookSlug, b.imageUrl, b.title,
      AVG(r.rating) as rating, MAX(g.slug) as genreSlug, CONCAT(MAX(a.firstname), ' ', MAX(a.lastname)) as author,
      COUNT(r.rating) as readCount
    FROM books b
      JOIN BookReview br ON b.id = br.bookId
      JOIN reviews r ON br.reviewId = r.id
      JOIN BookGenre bg ON b.id = bg.bookId
      JOIN genres g ON bg.genreId = g.id
      JOIN BookAuthor ba ON b.id = ba.bookId
      JOIN authors a ON ba.authorId = a.id
    WHERE r.active = true
    GROUP BY b.id
    ORDER BY rating DESC
    LIMIT 5;
  `, { type: Sequelize.QueryTypes.SELECT });

  for (let i = 0; i < books.length; i++) {
    books[i].rating = parseInt(books[i].rating);
  }

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

async function postBook(ctx) {
  const { genreId, isbn, title, pages, authorId, description, imageUrl } = ctx.request.body;

  const book = await Book.create({
    title,
    slug: slugify(title),
    pages,
    description,
    imageUrl,
  });

  book.setGenres(genreId);
  if (authorId) {
    book.setAuthors(authorId);
  }

  Isbn.create({
    isbn,
    bookId: book.dataValues.id,
  });

  ctx.body = {
    data: {
      slug: slugify(title),
    },
  };
};

async function addImage(ctx) {
  const { imageUrl, bookId } = ctx.request.body;
  Book.update(
    { imageUrl },
    { where: { id: bookId }}
  );
  ctx.body = {
    imageUrl,
    bookId,
  };

}

async function addGenre(ctx) {
  const { bookId, genreId } = ctx.request.body;

  let date = moment().format('YYYY-MM-DD HH:MM:SS');

  const relation = await connection.query(`
    INSERT INTO BookGenre (createdAt, updatedAt, bookId, genreId)
    VALUES ((:date), (:date), (:bookId), (:genreId));
  `, { replacements: { date, bookId, genreId }, type: Sequelize.QueryTypes.INSERT });

  ctx.body = {
    bookId,
    genreId,
  };
}

async function editPages(ctx) {
  const { bookId, pages } = ctx.request.body;

  try {
    const book = await Book.update(
      { pages },
      { where: { id: bookId }}
    );
    ctx.body = { success: true };
  } catch (e) { ctx.throw(err.status || 403); }

}

router.post('/image', adminAuthenticated, addImage);
router.post('/genre', adminAuthenticated, addGenre);

router.patch('/edit/', adminAuthenticated, editBook);
router.patch('/edit/pages', adminAuthenticated ,editPages);

router.post('/', adminAuthenticated, postBook);

router.get('/id/:id', getBook);
router.get('/isbn/:isbn', getBookFromIsbn);
router.get('/slug/:slug', getBookFromSlug);
router.get('/', getAllBooks);
router.get('/recently', getRecentlyReviewedBooks);
router.get('/highest', getHighestRatedBooks);
router.get('/search', searchForBooks);
router.get('/count', getCount);
router.get('/genre/:genre/search', searchForBooksWithGenre);
router.get('/read/:id', getBooksReadById);

module.exports = router;
