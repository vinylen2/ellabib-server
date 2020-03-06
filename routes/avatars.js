const router = require('koa-router')({ prefix: '/avatar' });
const { Avatar, Color, UserAvatar } = require('../models');
const moment = require('moment');

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

  if (ctx.state.env === 'production' && userId == ctx.state.jwt.userId || ctx.state.jwt.roleId == 3) {
    let date = moment().format('YYYY-MM-DD');
    const updatedA = await UserAvatar.update(
      { avatarId, colorId, updatedAt: date},
      { where: { userId }}
    );

    ctx.body = {
      success: true,
    };

  } else ctx.throw(403, 'Forbidden');
};

router.get('/', getAllAvatars);
router.patch('/', authenticated, updateAvatar);

module.exports = router;