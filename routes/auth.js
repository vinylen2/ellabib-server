const router = require('koa-router')({ prefix: '/auth' });
const _ = require('lodash');
const axios = require('axios');
const qs = require ('querystring');

const config = require('../config.json');
const skolon = require('../config.json').skolon;

const OAuthApi = axios.create({
  baseURL: 'https://idp.skolon.com/oauth/',
});

const PartnerApi = axios.create({
  baseURL: 'https://api.skolon.com/v2/partner/',
});

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
    const user = await PartnerApi.get('user/session', partnerConfig);
    console.log(user);
    // ctx.body = {
    //   login,
    // };
  } catch (e) { console.log(e) }
}

async function getUsers(ctx) {
  console.log('getting users');
  let body = {
    grant_type: 'client_credentials',
  };

  let buf = Buffer.from(`${skolon.client_id}:${skolon.client_secret}`);
  let encoded = buf.toString('base64');

  let config = {
    headers: {
      'Authorization': 'Basic ' + encoded,
    },
  };

  const access_token = await OAuthApi.post('access_token', body, config);
  console.log(access_token);
};

router.post('/admin', authAdmin);
router.get('/skolon/:code', authSkolon);
router.get('/users/', getUsers);
router.get('/logout', logoutAdmin);

module.exports = router;