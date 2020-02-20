const router = require('koa-router')({ prefix: '/auth' });
const _ = require('lodash');
const axios = require('axios');
const qs = require ('querystring');
const moment = require('moment');

const jwt = require('jsonwebtoken');
const secret = require('../config.json').secret;

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
          SET classId = (:classId), (:updatedAt)
          WHERE userId = (:userId);
        `, { replacements: { userId, classId, date }, type: Sequelize.QueryTypes.UPDATE });
      }

      const token = jwt.sign({ id: userId }, secret, { expiresIn: "4h" });

      ctx.body = {
        data: {
          token,
          user: user[0].dataValues,
        },
      };
    } catch (e) { console.log(e) }
  } catch (e) { console.log(e) }
}

const authenticated = require('../middleware/authenticated.js');

async function stuff(ctx) {
  console.log(date);
  ctx.body = 'yay';
};

router.get('/skolon/:code', authSkolon);
router.post('/jwt', auth);
router.get('/protected', authenticated, stuff);

module.exports = router;