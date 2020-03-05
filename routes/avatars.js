const router = require('koa-router')({ prefix: '/avatar' });
const { Avatar, Color, UserAvatar } = require('../models');
const moment = require('moment');

const { connection } = require('../models');
const Sequelize = require('sequelize');

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

  let date = moment().format('YYYY-MM-DD');

  const updatedA = await UserAvatar.update(
    { avatarId, colorId, updatedAt: date},
    { where: { userId }}
  );

  ctx.body = {
    success: true,
  };
};

router.get('/', getAllAvatars);
router.patch('/', updateAvatar);

module.exports = router;