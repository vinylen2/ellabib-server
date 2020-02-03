const router = require('koa-router')({ prefix: '/classes' });
const { connection } = require('../models');
const Sequelize = require('sequelize');

async function getClasses (ctx) {
  const queries = ctx.request.query;

  let classes;
  classes = await connection.query(`
  SELECT SUM(U.pagesRead) AS pagesRead, 
    SUM(U.booksRead) AS booksRead, 
    SUM(U.reviewsWritten) AS reviewsWritten,
    C.displayName
  FROM classes C
    JOIN UserClass UC ON C.id = UC.classId
    JOIN users U ON U.id = UC.userId
  ${queries.class ? 'WHERE C.displayName IN (:classes)' : ''}
  GROUP BY C.id
  `, { replacements: { classes: queries.class }, type: Sequelize.QueryTypes.SELECT });

  ctx.body = {
    data: classes,
  };
};

router.get('/', getClasses);

module.exports = router;

