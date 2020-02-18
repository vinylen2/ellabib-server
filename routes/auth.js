const router = require('koa-router')({ prefix: '/auth' });
const _ = require('lodash');
const axios = require('axios');
const config = require('../config.json');
const skolon = require('../config.json').skolon;

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

async function authSkolon(ctx) {
  const body = ctx.request.body;
  console.log(body);

}

router.post('/admin', authAdmin);
router.post('/skolon/callback', authSkolon);
router.get('/logout', logoutAdmin);

module.exports = router;