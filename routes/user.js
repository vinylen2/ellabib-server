const router = require('koa-router')({ prefix: '/user' });
const { User, Role, Class, SchoolUnit } = require('../models');
const { connection } = require('../models');
const Sequelize = require('sequelize');

const authenticated = require('../middleware/authenticated.js');

async function getUserPoints(ctx) {
  const userId = ctx.params.id;

  let srpPoints = 0;
  let trpPoints = 0;
  let arpPoints = 0;

  const srp = await connection.query(`
    SELECT 
      SUM(B.pages) as points
    FROM users U
        LEFT JOIN BookReviewer BRR ON U.id = BRR.userId
        LEFT JOIN reviews R ON BRR.reviewId = R.id AND R.active
        LEFT JOIN BookReview Br ON R.id = Br.reviewId
        LEFT JOIN books B ON Br.bookId = B.id
    WHERE U.id = (:userId) AND R.simple
    GROUP BY U.id;
  `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

  const trp = await connection.query(`
    SELECT 
      SUM(B.pages) * 2 as points
    FROM users U
      LEFT JOIN BookReviewer BRR ON U.id = BRR.userId
        LEFT JOIN reviews R ON BRR.reviewId = R.id AND R.active
        LEFT JOIN BookReview Br ON R.id = Br.reviewId
        LEFT JOIN books B ON Br.bookId = B.id
    WHERE U.id = (:userId) AND R.simple = 0 AND R.reviewAudioUrl IS NULL;
  `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

  const arp = await connection.query(`
    SELECT 
      SUM(B.pages) * 3 as points
    FROM users U
        LEFT JOIN BookReviewer BRR ON U.id = BRR.userId
        LEFT JOIN reviews R ON BRR.reviewId = R.id AND R.active
        LEFT JOIN BookReview Br ON R.id = Br.reviewId
        LEFT JOIN books B ON Br.bookId = B.id
    WHERE U.id = (:userId) AND R.simple = 0 AND R.reviewAudioUrl IS NOT NULL;
  `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

  if (srp[0].points) {
    srpPoints = parseInt(srp[0].points)
  }
  if (trp[0].points) {
    trpPoints = parseInt(trp[0].points)
  }
  if (arp[0].points) {
    arpPoints = parseInt(arp[0].points)
  }
  let points = srpPoints + trpPoints + arpPoints;

  ctx.body = {
    points,
  };
};


async function getUserInfo(ctx) {
  const userId = ctx.params.id;

  if (ctx.state.env === 'development' || userId == ctx.state.jwt.id || ctx.state.jwt.roleId == 3) {
    const user = await connection.query(`
      SELECT 
        C.id as classId,
        SU.id as schoolUnitId,
        SUM(B.pages) as pagesRead,
        COUNT(R.id) as booksRead,
        SUM(R.simple = 0) as reviewsWritten
      FROM users U
        LEFT JOIN UserSchoolUnit USU ON U.id = USU.userId
        LEFT JOIN schoolUnits SU ON USU.schoolUnitId = SU.id
        LEFT JOIN UserClass UC ON U.id = UC.userId
        LEFT JOIN classes C ON UC.classId = C.id
        LEFT JOIN BookReviewer BRR ON U.id = BRR.userId
        LEFT JOIN reviews R ON BRR.reviewId = R.id AND R.active
        LEFT JOIN BookReview Br ON R.id = Br.reviewId
        LEFT JOIN books B ON Br.bookId = B.id
      WHERE U.id = (:userId)
        GROUP BY U.id, C.id, SU.id;
    `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

      const dbClass = await connection.query(`
      SELECT C.id,
        SUM(B.pages) as pagesRead, 
        C.displayName, 
        COUNT(R.id) as booksRead,
        SUM(R.simple = 0) as reviewsWritten
      FROM users U   
        JOIN BookReviewer BRR ON U.id = BRR.userId
        JOIN reviews R ON BRR.reviewId = R.id
        JOIN BookReview Br ON R.id = Br.reviewId
        JOIN books B ON Br.bookId = B.id
        JOIN UserClass UC ON U.id = UC.userId
        JOIN classes C ON UC.classId = C.id
      WHERE C.id = (:classId)
      AND R.active = TRUE
      GROUP BY C.id;
      `, { replacements: { classId: user[0].classId }, type: Sequelize.QueryTypes.SELECT });

      const schoolUnit = await connection.query(`
      SELECT SU.id, SU.displayName,
        SUM(B.pages) as pagesRead,
        SUM(R.simple = 0) as reviewsWritten,
        COUNT(R.id) as booksRead
      FROM schoolUnits SU
        JOIN UserSchoolUnit USU ON SU.id = USU.schoolUnitId
        JOIN users U ON USU.userId = U.id
        JOIN BookReviewer BRR ON U.id = BRR.userId
        JOIN reviews R ON BRR.reviewId = R.id
        JOIN BookReview Br ON R.id = Br.reviewId
        JOIN books B ON Br.bookId = B.id
      WHERE SU.id = (:schoolUnitId)
      AND R.active = TRUE
      GROUP BY SU.id;
      `, { replacements: { schoolUnitId: user[0].schoolUnitId }, type: Sequelize.QueryTypes.SELECT });

    let srpPoints = 0;
    let trpPoints = 0;
    let arpPoints = 0;
    let points = 0;

    const srp = await connection.query(`
      SELECT 
        COUNT(B.id) * 10 as points
      FROM users U
          LEFT JOIN BookReviewer BRR ON U.id = BRR.userId
          LEFT JOIN reviews R ON BRR.reviewId = R.id AND R.active
          LEFT JOIN BookReview Br ON R.id = Br.reviewId
          LEFT JOIN books B ON Br.bookId = B.id
      WHERE U.id = (:userId) AND R.simple
      GROUP BY U.id;
    `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

    const trp = await connection.query(`
      SELECT 
        COUNT(B.id) * 20 as points
      FROM users U
        LEFT JOIN BookReviewer BRR ON U.id = BRR.userId
          LEFT JOIN reviews R ON BRR.reviewId = R.id AND R.active
          LEFT JOIN BookReview Br ON R.id = Br.reviewId
          LEFT JOIN books B ON Br.bookId = B.id
      WHERE U.id = (:userId) AND R.simple = 0 AND R.reviewAudioUrl IS NULL;
    `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

    const arp = await connection.query(`
      SELECT 
        COUNT(B.id) * 30 as points
      FROM users U
          LEFT JOIN BookReviewer BRR ON U.id = BRR.userId
          LEFT JOIN reviews R ON BRR.reviewId = R.id AND R.active
          LEFT JOIN BookReview Br ON R.id = Br.reviewId
          LEFT JOIN books B ON Br.bookId = B.id
      WHERE U.id = (:userId) AND R.simple = 0 AND R.reviewAudioUrl IS NOT NULL;
    `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

    if (srp[0] && srp[0].points !== null) {
      srpPoints = parseInt(srp[0].points)
    }
    if (trp[0] && trp[0].points !== null) {
      trpPoints = parseInt(trp[0].points)
    }
    if (arp[0] && arp[0].points !== null) {
      arpPoints = parseInt(arp[0].points)
    }
    points = srpPoints + trpPoints + arpPoints;

    ctx.body = {
      data: {
        pagesRead: user[0].pagesRead,
        booksRead: user[0].booksRead,
        reviewsWritten: user[0].reviewsWritten,
        points,
        class: dbClass[0],
        schoolUnit: schoolUnit[0],
      },
    };
  } else ctx.throw(403, 'Forbidden');
};

async function getFavouriteGenre(ctx) {
  const userId = ctx.params.id;

  if (ctx.state.env === 'development' || userId == ctx.state.jwt.id || ctx.state.jwt.roleId == 3) {
    const favouriteGenre = await connection.query(`
      SELECT G.id as genreId, G.name, G.slug, COUNT(G.name) as userCount, U.id as userId FROM books B
        JOIN BookGenre BG ON B.id = BG.bookId
        JOIN genres G ON BG.genreId = G.id
        JOIN BookReview BR on B.id = BR.bookId
        JOIN reviews R ON BR.reviewId = R.id
        JOIN BookReviewer BRR ON R.id = BRR.reviewId
        JOIN users U ON BRR.userId = U.id
      WHERE U.id = (:userId)
      GROUP BY G.id
      ORDER BY userCount DESC
      LIMIT 1;
    `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

    ctx.body = {
      data: favouriteGenre[0],
    };
  } else ctx.throw(403, 'Forbidden');
};

async function getRecentlyRead(ctx) {
  const userId = ctx.params.id;
  if (ctx.state.env === 'development' || userId == ctx.state.jwt.id || ctx.state.jwt.roleId == 3) {

    const latestReads = await connection.query(`
      SELECT b.id as bookId, b.slug as bookSlug, b.imageUrl, b.title, b.pages,
        r.rating, r.id as reviewId, r.simple, r.updatedAt as publishDate,
        g.id, g.slug as genreSlug,
        a.id as authorId, CONCAT(a.firstname, ' ', a.lastname) as author
      FROM books b
        JOIN BookReview br ON b.id = br.bookId
        JOIN BookReviewer brr ON br.reviewId = brr.reviewId
        JOIN reviews r ON br.reviewId = r.id
        JOIN users u ON brr.userId = u.id
        JOIN BookGenre bg ON b.id = bg.bookId
        JOIN genres g ON bg.genreId = g.id
        JOIN BookAuthor ba ON b.id = ba.bookId
        JOIN authors a ON ba.authorId = a.id
      WHERE u.id = (:userId) AND r.active
      ORDER BY publishDate DESC
      LIMIT 5;
    `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

    ctx.body = {
      data: latestReads,
    };
  } else ctx.throw(403, 'Forbidden');
};

async function getUserFavourites(ctx) {
  const userId = ctx.params.id;

  if (ctx.state.env === 'development' || userId == ctx.state.jwt.id || ctx.state.jwt.roleId == 3) {

    const favourites = await connection.query(`
      SELECT b.id as bookId, b.slug as bookSlug, b.imageUrl, b.title,
        r.rating, g.slug as genreSlug, CONCAT(a.firstname, ' ', a.lastname) as author, u.id
      FROM books b
        JOIN BookReview br ON b.id = br.bookId
        JOIN reviews r ON br.reviewId = r.id
        JOIN BookGenre bg ON b.id = bg.bookId
        JOIN genres g ON bg.genreId = g.id
        JOIN BookAuthor ba ON b.id = ba.bookId
        JOIN authors a ON ba.authorId = a.id
        JOIN BookReviewer brr on r.id = brr.reviewId
        JOIN users u on brr.userId = u.id
      WHERE r.active = true AND u.id = (:userId)
      ORDER BY rating DESC
      LIMIT 5;
    `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

    ctx.body = {
      data: favourites,
    };
  } else ctx.throw(403, 'Forbidden');

};

router.get('/recently-read/:id', authenticated, getRecentlyRead);
router.get('/favourite-genre/:id', authenticated, getFavouriteGenre);

router.get('/id/:id', authenticated, getUserInfo);
router.get('/points/:id', getUserPoints);
router.get('/favourites/:id', authenticated, getUserFavourites);

module.exports = router;