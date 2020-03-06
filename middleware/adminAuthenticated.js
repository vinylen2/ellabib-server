const jwt = require('jsonwebtoken');
const secret = require('../config.json').secret;


module.exports = async (ctx, next) => {
  if (ctx.state.env === 'production') {
    if (!ctx.headers.authorization) ctx.throw(403, 'Forbidden.');

    const token = ctx.headers.authorization.split(' ')[1];
    try {
      const verified = jwt.verify(token, secret);
      if (verified.roleId == 3) {
        ctx.request.jwtPayload = verified;
      } else {
        ctx.throw(403, 'Not admin');
      }
    } catch (err) {
      ctx.throw(err.status || 403, err.text);
    }
  }
  await next();
};