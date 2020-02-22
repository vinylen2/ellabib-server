const router = require('koa-router')({ prefix: '/user' });
const { User, Role, Class, SchoolUnit } = require('../models');
const { connection } = require('../models');
const Sequelize = require('sequelize');

const authenticated = require('../middleware/authenticated.js');

async function getUserInfo(ctx) {
  const userId = ctx.params.id;

  // if (userId == ctx.state.jwt.userId || ctx.state.jwt.roleId == 3) {
    const user = await connection.query(`
    SELECT U.id, U.firstName, U.lastName, U.extId,
      Ro.type as roleType, Ro.displayName as roleDisplayName,
      SUM(B.pages) as pagesRead,
      COUNT(R.id) as booksRead,
      SUM(R.simple = 0) as reviewsWritten,
      C.displayName as classDisplayName,
      C.id as classId,
      A.id as avatarId,
      A.imageUrl as avatarImageUrl,
      A.displayName as avatarDisplayName,
      A.type as avatarType,
      SU.id as schoolUnitId, SU.displayName as schoolUnitDisplayName
    FROM users U
      JOIN roles Ro ON U.roleId = Ro.id
      JOIN UserClass UC ON U.id = UC.userId
      JOIN classes C ON UC.classId = C.id
      JOIN BookReviewer BRR ON U.id = BRR.userId
      JOIN reviews R ON BRR.reviewId = R.id
      JOIN BookReview Br ON R.id = Br.reviewId
      JOIN books B ON Br.bookId = B.id
      JOIN avatars A ON U.avatarId = A.id
      JOIN UserSchoolUnit USU ON U.id = USU.userId
      JOIN schoolUnits SU ON USU.schoolUnitId = SU.id 
    WHERE U.id = (:userId)
    GROUP BY U.id, C.id, C.displayName, SU.id;
    `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

    ctx.body = {
      data: user,
    };
  // } else ctx.throw(403, 'Forbidden');
};

async function switchAvatar(ctx) {
  const { userId, avatarId } = ctx.request.body;

  try {
    await User.update(
      { avatarId },
      { where: { id: userId } },
    );
    ctx.body = {
      data: {
        avatarId,
      },
      message: 'User updated',
    }
  } catch (e) {
    ctx.body = {
      data: null,
      message: 'User updated',
    }
  }
};

async function getFavouriteGenre(ctx) {
  const userId = ctx.params.id;

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
    data: {
      favouriteGenre: favouriteGenre[0],
    }
  };
};

router.patch('/avatar', switchAvatar);
router.get('/id/:id', getUserInfo);
router.get('/favourite-genre/:id', getFavouriteGenre);

module.exports = router;