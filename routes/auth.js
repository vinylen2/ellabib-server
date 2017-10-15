const router = require('koa-router')({ prefix: '/auth' });
const _ = require('lodash');
const config = require('../config.json');

async function authAdmin(ctx) {
    const { username, password } = ctx.request.body;
    let auth = false;

    if (username == config.auth.username && password == config.auth.password) {
        ctx.cookies.set('admin', true);
        auth = true;
    }

    ctx.body = {
        auth,
    };
}

async function authIp(ctx) {
    const ip = ctx.ip;
    let ipAuth = false;
    const index = (_.indexOf(config.allowedToPublish, ip));
    console.log(index);

    if (index > -1) {
        ctx.cookies.set('publishReview', true);
        ipAuth = true;
    }

    ctx.body = {
        ipAuth,
    };
}

router.post('/admin', authAdmin);
router.get('/', authIp);

module.exports = router;