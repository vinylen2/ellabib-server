const router = require('koa-router')({ prefix: '/auth' });
const _ = require('lodash');
const axios = require('axios');
const qs = require ('querystring');

const { connection } = require('../models');
const Sequelize = require('sequelize');

const skolon = require('../config.json').skolon;
const { User, Role, Class, SchoolUnit } = require('../models');

const OAuthApi = axios.create({
  baseURL: 'https://idp.skolon.com/oauth/',
});

const PartnerApi = axios.create({
  baseURL: 'https://api.skolon.com/v2/partner/',
});

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
    const userClassResponse = await PartnerApi.get(`group?userId=${session.data.userId}`, partnerConfig);

    const skolonUser = userResponse.data.users[0];
    const skolonUserClass = _.find(userClassResponse.data.groups, { type: 'CLASS' });

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

      const dbClass = await Class.findOrCreate({
        where: {
          extId: skolonUserClass.id
        },
        defaults: {
          displayName: skolonUserClass.name,
        },
      });

      // erorr handling if created?
      const userId = user[0].dataValues.id;
      const classId = dbClass[0].dataValues.id;

      const hasRelation = await User.find({
        where: { id: userId },
        include: [
          {
            model: Class,
            required: true,
          },
        ],
      })
      if (hasRelation == null) {
      // add createdAt and updatedAt for todays date
        const relation = await connection.query(`
          INSERT INTO UserClass (createdAt, updatedAt, classId, userId)
          VALUES ('2017-10-04 14:49:18', '2017-10-04 14:49:18', (:classId), (:userId));
        `, { replacements: { userId, classId }, type: Sequelize.QueryTypes.INSERT });
      } else {
        const relation = await connection.query(`
          UPDATE UserClass 
          SET classId = (:classId)
          WHERE userId = (:userId);
        `, { replacements: { userId, classId }, type: Sequelize.QueryTypes.UPDATE });
      }


      ctx.body = {
        data: {
          user: user[0].dataValues,
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


const jwt = require('jsonwebtoken');
const secret = require('../config.json').secret;

async function auth(ctx) {
  // should be extId from Skolon
  const { extId } = ctx.request.body;

  if (extId == 1) {
    const token = jwt.sign({ id: extId }, secret, { expiresIn: "10000" });
    ctx.body = token;
  } else {
    ctx.body = 'No user found';
  }
};

const authenticated = require('../middleware/authenticated.js');

async function stuff(ctx) {
  ctx.body = 'yay';
};

router.get('/skolon/:code', authSkolon);
//router.get('/users/', getUsers);
router.post('/jwt', auth);
router.get('/protected', authenticated, stuff);

module.exports = router;