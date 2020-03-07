const router = require('koa-router')({ prefix: '/avatar' });
const { Avatar, Color, UserAvatar, connection } = require('../models');
const moment = require('moment');
const Sequelize = require('sequelize');

const authenticated = require('../middleware/authenticated.js');

async function getAllAvatars(ctx) {
  const avatars = await Avatar.findAll({
    attributes: ['id', 'icon', 'displayName',],
  });

  const colors = await Color.findAll({
    attributes: ['id', 'color', 'displayName'],
  });

  ctx.body = {
    avatars,
    colors,
  };
};

async function updateAvatar(ctx) {
  const { userId, avatarId, colorId } = ctx.request.body;

  if (ctx.state.env === 'development' || userId == ctx.state.jwt.userId || ctx.state.jwt.roleId == 3) {
    let date = moment().format('YYYY-MM-DD');
    const updatedA = await UserAvatar.update(
      { avatarId, colorId, updatedAt: date},
      { where: { userId }}
    );

    const newAvatar = await connection.query(`
      SELECT a.icon as avatarIcon, co.color as avatarColor
      FROM users U
        JOIN UserAvatars UA ON U.id = UA.userId
        JOIN avatars A ON UA.avatarId = A.id
        JOIN colors co ON UA.colorId = co.id
      WHERE U.id = (:userId);
    `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

    ctx.body = {
      data: newAvatar[0],
    };

  } else ctx.throw(403, 'Forbidden');
};

router.get('/', getAllAvatars);
router.patch('/', authenticated, updateAvatar);

module.exports = router;