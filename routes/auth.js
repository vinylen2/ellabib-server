const router = require('koa-router')({ prefix: '/auth' });
const _ = require('lodash');
const axios = require('axios');
const qs = require ('querystring');

const config = require('../config.json');
const skolon = require('../config.json').skolon;
const { User, Role, Class, SchoolUnit } = require('../models');

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

    const session = await PartnerApi.get('user/session', partnerConfig);
    const userResponse = await PartnerApi.get(`user?userId=${session.data.userId}`, partnerConfig);
    const userClassResponse = await PartnerApi.get(`group?userId=${session.data.userId}`);

    const skolonUser = userResponse.data.users[0];
    console.log(userClassResponse);
    const skolonUserClass = _.find(userClassResponse.data.users, { type: 'CLASS' });
    console.log(skolonUserClass);

    try {
    let roleId;
      switch (skolonUser.userType) {
        case 'TEACHER':
          roleId = 1;
          break;
        case 'STUDENT':
          roleId = 2;
          break;
        default:
          roleId = 2;
          break;
      }
      const user = await User.findOrCreate({
        where: {
          extId: skolonUser.id,
        },
        defaults: {
          roleId,
        },
      });

      ctx.body = {
        data: {
          user,
          access_token: session.data.access_token,
        },
      };
    } catch (e) { console.log(e) }
  } catch (e) { console.log(e) }
}

async function getUsers(ctx) {
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

  try {
    const auth = await OAuthApi.post('access_token', qs.stringify(body), config);
    let partnerConfig = {
      headers: {
        'Authorization': 'Bearer ' + auth.data.access_token,
      },
    };

    const users = await PartnerApi.get('group', partnerConfig);
    ctx.body = {
      data: users.data,
    };

  } catch (e) { console.log(e) }
};

router.post('/admin', authAdmin);
router.get('/skolon/:code', authSkolon);
// router.get('/users/', getUsers);
router.get('/logout', logoutAdmin);

module.exports = router;