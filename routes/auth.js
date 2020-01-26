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

router.post('/admin', authAdmin);
router.get('/logout', logoutAdmin);

module.exports = router;