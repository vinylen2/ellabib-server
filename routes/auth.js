const router = require('koa-router')({ prefix: '/auth' });
const _ = require('lodash');
const config = require('../config.json');

async function authAdmin(ctx) {
    const { username, password } = ctx.request.body;
    let auth = false;

    if (username.toLowerCase() == config.auth.username && password == config.auth.password) {
        ctx.cookies.set('admin', true, { maxAge: 3600000 });
        auth = true;
    }

    ctx.body = {
        auth,
    };
}

async function logoutAdmin(ctx) {
    ctx.cookies.set('admin', false, { maxAge: 1 });
    ctx.body = {
        auth: false,
    };
}

async function authIp(ctx) {
    const ip = ctx.request.ip;
    let ipAuth = false;
    const index = (_.indexOf(config.allowedToPublish, ip));

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
router.get('/logout', logoutAdmin);

module.exports = router;