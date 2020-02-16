const router = require('koa-router')({ prefix: '/avatar' });
const { User, Avatar } = require('../models');

async function getAllAvatars(ctx) {
  const avatars = await Avatar.findAll({
    attributes: ['id', 'type', 'imageUrl', 'displayName',],
  });

  ctx.body = {
    data: avatars,
  };
};

router.get('/', getAllAvatars);

module.exports = router;