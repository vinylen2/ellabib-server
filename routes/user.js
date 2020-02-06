const router = require('koa-router')({ prefix: '/user' });
// const { User, Role, Class, SchoolUnit } = require('../models');
const { connection } = require('../models');
const Sequelize = require('sequelize');

async function getUserInfo(ctx) {
  const userId = ctx.params.id;

  const user = await connection.query(`
  SELECT U.id, U.firstName, U.lastName, U.extId,
    Ro.type, Ro.displayName,
    SUM(B.pages) as pagesRead,
    COUNT(R.id) as booksRead,
    SUM(R.simple = 0) as reviewsWritten,
    C.displayName as classDisplayName,
    C.id as classId
  FROM Users U
    JOIN Roles Ro ON U.roleId = Ro.id
    JOIN UserClass UC ON U.id = UC.userId
    JOIN Classes C ON UC.classId = C.id
    JOIN BookReviewer BRR ON U.id = BRR.userId
    JOIN Reviews R ON BRR.reviewId = R.id
    JOIN BookReview Br ON R.id = Br.reviewId
    JOIN Books B ON Br.bookId = B.id
  WHERE U.id = (:userId)
  GROUP BY U.id, C.id, C.displayName;
  `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

  ctx.body = {
    data: user,
  };
};

router.get('/id/:id', getUserInfo);
module.exports = router;