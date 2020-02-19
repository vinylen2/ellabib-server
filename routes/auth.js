const router = require('koa-router')({ prefix: '/auth' });
const _ = require('lodash');
const axios = require('axios');
const qs = require ('querystring');

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
  const code = ctx.params.code;

  let OAuthApi = axios.create({
    baseURL: 'https://idp.skolon.com/oauth/',
  });

  let PartnerApi = axios.create({
    baseURL: 'https://api.skolon.com/v2/partner/',
  });


  let body = {
    code,
    client_id: skolon.client_id,
    client_secret: skolon.client_secret,
    redirect_uri: 'https://ellabib.se/login',
    grant_type: 'authorization_code'
  };

  let config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  try {
    const login = await OAuthApi.post('access_token', qs.stringify(body), config);
    let partnerConfig = {
      headers: {
        'Authorization': 'Bearer ' + login.data.access_token,
      },
    };
    const user = PartnerApi.get('user/session', partnerConfig);
    console.log(user);
    // ctx.body = {
    //   login,
    // };
  } catch (e) { console.log(e) }
}

router.post('/admin', authAdmin);
router.get('/skolon/:code', authSkolon);
router.get('/logout', logoutAdmin);

module.exports = router;