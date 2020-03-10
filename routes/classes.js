const router = require('koa-router')({ prefix: '/classes' });
const _ = require('lodash');
const { connection } = require('../models');
const Sequelize = require('sequelize');

const authenticated = require('../middleware/authenticated.js');

async function getClasses (ctx) {
  const classes = await connection.query(`
    SELECT SUM(B.pages) as pagesRead, 
      C.displayName, 
      COUNT(R.id) as booksRead,
      SUM(R.simple = 0) as reviewsWritten,
      C.id,
      0 AS points
    FROM users U 
      LEFT JOIN BookReviewer BRR ON U.id = BRR.userId
      LEFT JOIN reviews R ON BRR.reviewId = R.id
      LEFT JOIN BookReview Br ON R.id = Br.reviewId
      LEFT JOIN books B ON Br.bookId = B.id
      LEFT JOIN UserClass UC ON U.id = UC.classId
      LEFT JOIN classes C ON UC.classId = C.id
    WHERE U.roleId = 2
    AND R.active = TRUE
    GROUP BY C.id
  `, {type: Sequelize.QueryTypes.SELECT });

  const srpArray = await connection.query(`
    SELECT 
      SUM(B.pages) as points, C.id as classId, C.displayName as classDisplayName
    FROM users U
        LEFT JOIN BookReviewer BRR ON U.id = BRR.userId
        LEFT JOIN reviews R ON BRR.reviewId = R.id AND R.active
        LEFT JOIN BookReview Br ON R.id = Br.reviewId
        LEFT JOIN books B ON Br.bookId = B.id
        LEFT JOIN UserSchoolUnit USU ON U.id = USU.userId
        LEFT JOIN schoolUnits SU ON USU.schoolUnitId = SU.id
        LEFT JOIN UserClass UC ON U.id = UC.userId
        LEFT JOIN classes C ON UC.classId = C.id
    WHERE R.simple AND R.active
        GROUP BY C.id;
  `, { type: Sequelize.QueryTypes.SELECT });

  const trpArray = await connection.query(`
    SELECT 
      SUM(B.pages) * 2 as points, C.id as classId, C.displayName as classDisplayName
    FROM users U
        LEFT JOIN BookReviewer BRR ON U.id = BRR.userId
        LEFT JOIN reviews R ON BRR.reviewId = R.id AND R.active
        LEFT JOIN BookReview Br ON R.id = Br.reviewId
        LEFT JOIN books B ON Br.bookId = B.id
        LEFT JOIN UserSchoolUnit USU ON U.id = USU.userId
        LEFT JOIN schoolUnits SU ON USU.schoolUnitId = SU.id
        LEFT JOIN UserClass UC ON U.id = UC.userId
        LEFT JOIN classes C ON UC.classId = C.id 
    WHERE R.simple = 0 AND R.reviewAudioUrl IS NULL
        GROUP BY C.id;
  `, { type: Sequelize.QueryTypes.SELECT });

  const arpArray = await connection.query(`
    SELECT 
      SUM(B.pages) * 3 as points, C.id as classId, C.displayName as classDisplayName
    FROM users U
        LEFT JOIN BookReviewer BRR ON U.id = BRR.userId
        LEFT JOIN reviews R ON BRR.reviewId = R.id AND R.active
        LEFT JOIN BookReview Br ON R.id = Br.reviewId
        LEFT JOIN books B ON Br.bookId = B.id
        LEFT JOIN UserSchoolUnit USU ON U.id = USU.userId
        LEFT JOIN schoolUnits SU ON USU.schoolUnitId = SU.id
        LEFT JOIN UserClass UC ON U.id = UC.userId
        LEFT JOIN classes C ON UC.classId = C.id
    WHERE R.simple = 0 AND R.reviewAudioUrl is not null
        GROUP BY C.id;
  `, { type: Sequelize.QueryTypes.SELECT });

  for (let i = 0; i < classes.length; i++) {
    classes[i].pagesRead = parseInt(classes[i].pagesRead);
    classes[i].reviewsWritten = parseInt(classes[i].reviewsWritten);
    classes[i].points = getPointValue(srpArray, classes[i].id);
    classes[i].points += (getPointValue(trpArray, classes[i].id) * 2);
    classes[i].points += (getPointValue(arpArray, classes[i].id) * 3);
  }

  ctx.body = {
    data: classes,
  };
};

function getPointValue(array, id) {
  let point = _.find(array, { classId: id});
  if (point && point.points !== null) {
    return parseInt(point.points);
  } return 0;
}

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

router.get('/', authenticated, getClasses);
router.get('/:id', authenticated, getClassById);

module.exports = router;

