const router = require('koa-router')({ prefix: '/auth' });
const _ = require('lodash');
const axios = require('axios');
const qs = require ('querystring');
const moment = require('moment');

const jwt = require('jsonwebtoken');
const secret = require('../config.json').secret;

const { connection } = require('../models');
const Sequelize = require('sequelize');

const adminCredentials = require('../config.json').adminCredentials;
const skolon = require('../config.json').skolon;
const { User, Class } = require('../models');

const OAuthApi = axios.create({
  baseURL: skolon.OAuthApi,
});

const PartnerApi = axios.create({
  baseURL: skolon.partnerApi,
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
    const skolonToken = login.data.access_token;

    const partnerConfig = {
      headers: {
        'Authorization': 'Bearer ' + skolonToken,
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
      }

      const user = await User.findOrCreate({
        where: {
          extId: skolonUser.id,
        },
        defaults: {
          roleId,
          avatarId: 13,
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

      const userId = user[0].dataValues.id;
      const dbRoleId = user[0].dataValues.roleId
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

      let date = moment().format();

      if (hasRelation == null) {
      // add createdAt and updatedAt for todays date
        const relation = await connection.query(`
          INSERT INTO UserClass (createdAt, updatedAt, classId, userId)
          VALUES ((:date), (:date), (:classId), (:userId));
        `, { replacements: { date, userId, classId }, type: Sequelize.QueryTypes.INSERT });
      } else {
        const relation = await connection.query(`
          UPDATE UserClass 
          SET classId = (:classId), updatedAt = (:date)
          WHERE userId = (:userId);
        `, { replacements: { userId, classId, date }, type: Sequelize.QueryTypes.UPDATE });
      }

      const ellabibToken = jwt.sign({ id: userId, roleId: dbRoleId }, secret, { expiresIn: "1h" });

      ctx.body = {
        data: {
          token: ellabibToken,
          user: user[0].dataValues,
        },
      };
    } catch (e) { console.log(e) }
  } catch (e) { console.log(e) }
}

async function authAdmin(ctx) {
  const { username, password } = ctx.request.body;
  
  if (!username) ctx.throw(422, 'Username required.');
  if (!password) ctx.throw(422, 'Password required.');

  if (username === adminCredentials.username && password === adminCredentials.password) {
    const ellabibToken = jwt.sign({ userId: adminCredentials.userId, roleId: 3 }, secret, { expiresIn: "1h" });
    ctx.body = {
      data: {
        token: ellabibToken,
        user: {
          id: adminCredentials.userId,
          roleId: 3,
        },
      },
    };
  } else {
    ctx.throw(422, 'Wrong credentials');
  }
};

const authenticated = require('../middleware/authenticated.js');
const adminAuthenticated = require('../middleware/adminAuthenticated.js');

async function stuff(ctx) {
  ctx.body = 'yay';
};

router.post('/admin', authAdmin);
router.get('/skolon/:code', authSkolon);

router.get('/protected', adminAuthenticated, stuff);

module.exports = router;