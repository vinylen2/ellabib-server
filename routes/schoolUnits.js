const router = require('koa-router')({ prefix: '/schoolunit' });
const { connection } = require('../models');
const Sequelize = require('sequelize');

async function getSchools(ctx) {
  const queries = ctx.request.query;

  const schools = await connection.query(`
  SELECT SU.id, SU.displayName,
    SUM(B.pages) as pagesRead,
    COUNT(R.id) as booksRead
  FROM SchoolUnits SU
    JOIN UserSchoolUnit USU ON SU.id = USU.schoolUnitId
    JOIN Users U ON USU.userId = U.id
    JOIN BookReviewer BRR ON U.id = BRR.userId
    JOIN Reviews R ON BRR.reviewId = R.id
    JOIN BookReview Br ON R.id = Br.reviewId
    JOIN Books B ON Br.bookId = B.id
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