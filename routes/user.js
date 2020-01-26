const router = require('koa-router')({ prefix: '/user' });
const { User, Role, Class, SchoolUnit } = require('../models');

async function getUserInfo(ctx) {
  const userId = ctx.params.id;
  const user = await User.findAll({
    where: {
      id: userId,
    },
    include: [
      {
        model: Role,
      },
      {
        model: Class,
      },
      {
        model: SchoolUnit,
      },
    ],
  });

  ctx.body = {
    data: user,
  };
};

router.get('/id/:id', getUserInfo);
module.exports = router;