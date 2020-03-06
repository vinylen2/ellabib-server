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

  for (let i = 0; i < classes.length; i++) {
    classes[i].pagesRead = parseInt(classes[i].pagesRead);
    classes[i].reviewsWritten = parseInt(classes[i].reviewsWritten);
  }

  ctx.body = {
    data: classes,
  };
};

async function getClassById(ctx) {
  const classId = ctx.params.id;

  const dbClass = await connection.query(`
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
  WHERE c.id = (:classId)
  AND R.active = TRUE
  GROUP BY C.id;
  `, { replacements: { classId }, type: Sequelize.QueryTypes.SELECT });

  ctx.body = {
    data: dbClass[0],
  };
}

router.get('/', getClasses);
router.get('/:id', getClassById);

module.exports = router;

