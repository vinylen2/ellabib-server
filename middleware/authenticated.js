const jwt = require('jsonwebtoken');
const secret = require('../config.json').secret;

module.exports = async (ctx, next) => {
  if (ctx.state.env === 'production') {
    if (!ctx.headers.authorization) ctx.throw(403, 'No token.');

    const token = ctx.headers.authorization.split(' ')[1];
    try {
      const jwToken = jwt.verify(token, secret);
      ctx.state.jwt = jwToken;
      ctx.request.jwtPayload = jwToken;
    } catch (err) {
      ctx.throw(err.status || 403, err.text);
    }
  }
  await next();
};