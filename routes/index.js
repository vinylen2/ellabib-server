const router = require('koa-router')({ prefix: '/' });

async function defaultRoute(ctx) {
  console.log(ctx.state.env);
};

router.get('/', defaultRoute);

module.exports = router;
