const router = require('koa-router')({ prefix: '/schoolunit' });
const { connection } = require('../models');
const Sequelize = require('sequelize');

async function getSchools(ctx) {
  const queries = ctx.request.query;

  const schools = await connection.query(`
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
  ${queries.schoolUnit ? 'WHERE SU.id IN (:schools)' : ''}
  AND R.active = TRUE
  GROUP BY SU.id;
  `, { replacements: { schools: queries.id }, type: Sequelize.QueryTypes.SELECT });

  ctx.body = {
    data: schools,
  };
};

router.get('/', getSchools);
module.exports = router;