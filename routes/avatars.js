const router = require('koa-router')({ prefix: '/avatar' });
const { Avatar, Color } = require('../models');

async function getAllAvatars(ctx) {
  const avatars = await Avatar.findAll({
    attributes: ['id', 'type', 'displayName',],
  });

  const colors = await Color.findAll({
    attributes: ['id', 'color', 'displayName'],
  });

  ctx.body = {
    avatars,
    colors,
  };
};

router.get('/', getAllAvatars);

module.exports = router;