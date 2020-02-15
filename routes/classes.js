const router = require('koa-router')({ prefix: '/classes' });
const { connection } = require('../models');
const Sequelize = require('sequelize');

async function getClasses (ctx) {
  const queries = ctx.request.query;

  const classes = await connection.query(`
  SELECT SUM(B.pages) as pagesRead, 
  	C.displayName, 
    COUNT(R.id) as booksRead,
    SUM(R.simple = 0) as reviewsWritten,
    C.id
  FROM users U   
    JOIN BookReviewer BRR ON U.id = BRR.userId
    JOIN reviews R ON BRR.reviewId = R.id
    JOIN BookReview Br ON R.id = Br.reviewId
    JOIN books B ON Br.bookId = B.id
    JOIN UserClass UC ON U.id = UC.classId
    JOIN classes C ON UC.classId = C.id
  ${queries.class ? 'WHERE C.displayName IN (:classes)' : ''}
  AND R.active = TRUE
  GROUP BY C.id
  `, { replacements: { classes: queries.class }, type: Sequelize.QueryTypes.SELECT });

  ctx.body = {
    data: classes,
  };
};

router.get('/', getClasses);

module.exports = router;

