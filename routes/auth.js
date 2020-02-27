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
    const userSchoolResponse = await PartnerApi.get(`school?userId=${session.data.userId}`, partnerConfig);

    const skolonUser = userResponse.data.users[0];
    const skolonUserClass = _.find(userClassResponse.data.groups, { type: 'CLASS' });
    const skolonUserSchool = userSchoolResponse.data.users[0];
    const skolonUserSchoolUnitCode = _.find(userSchoolResponse.data.schools[0].unitCodes[0], { type: 'SchoolUnitCode' });

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

      const dbSchool = await SchoolUnit.findOrCreate({
        where: { extId: skolonUserSchool.id },
        defaults: {
          displayName: skolonUserSchool.name,
          schoolUnitCode: skolonUserSchoolUnitCode,
        },
      });

      const userId = user[0].dataValues.id;
      const dbRoleId = user[0].dataValues.roleId
      const classId = dbClass[0].dataValues.id;
      const schoolUnitId = dbSchool[0].dataValues.id;

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

      const hasRelationSchool = await User.find({
        where: { id: userId },
        include: [
          {
            model: SchoolUnit,
            required: true,
          },
        ],
      })

      if (hasRelationSchool == null) {
      // add createdAt and updatedAt for todays date
        const relationSchool = await connection.query(`
          INSERT INTO UserSchoolUnit (createdAt, updatedAt, schoolUnitId, userId)
          VALUES ((:date), (:date), (:schoolUnitId), (:userId));
        `, { replacements: { date, userId, schoolUnitId }, type: Sequelize.QueryTypes.INSERT });
      } else {
        const relation = await connection.query(`
          UPDATE UserSchoolUnit
          SET schoolUnitId = (:schoolUnitId), updatedAt = (:date)
          WHERE userId = (:userId);
        `, { replacements: { userId, schoolUnitId, date }, type: Sequelize.QueryTypes.UPDATE });
      }

      const ellabibToken = jwt.sign({ id: userId, roleId: dbRoleId }, secret, { expiresIn: "1h" });

      const dbUser = await connection.query(`
      SELECT U.id, U.firstName, U.lastName, U.extId,
        Ro.type as roleType, Ro.displayName as roleDisplayName,
        SUM(B.pages) as pagesRead,
        COUNT(R.id) as booksRead,
        SUM(R.simple = 0) as reviewsWritten,
        C.displayName as classDisplayName,
        C.id as classId,
        A.id as avatarId,
        A.imageUrl as avatarImageUrl,
        A.displayName as avatarDisplayName,
        A.type as avatarType,
        SU.id as schoolUnitId, SU.displayName as schoolUnitDisplayName
      FROM users U
        JOIN roles Ro ON U.roleId = Ro.id
        JOIN UserClass UC ON U.id = UC.userId
        JOIN classes C ON UC.classId = C.id
        JOIN BookReviewer BRR ON U.id = BRR.userId
        JOIN reviews R ON BRR.reviewId = R.id
        JOIN BookReview Br ON R.id = Br.reviewId
        JOIN books B ON Br.bookId = B.id
        JOIN avatars A ON U.avatarId = A.id
        JOIN UserSchoolUnit USU ON U.id = USU.userId
        JOIN schoolUnits SU ON USU.schoolUnitId = SU.id 
      WHERE U.id = (:userId)
      GROUP BY U.id, C.id, C.displayName, SU.id;
      `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

      ctx.body = {
        data: {
          token: ellabibToken,
          user: dbUser,
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