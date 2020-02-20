const jwt = require('jsonwebtoken');
const secret = require('../config.json').secret;


module.exports = async (ctx, next) => {
  if (!ctx.headers.authorization) ctx.throw(403, 'No token.');

  const token = ctx.headers.authorization.split(' ')[1];
  try {
    ctx.request.jwtPayload = jwt.verify(token, secret);
  } catch (err) {
    ctx.throw(err.status || 403, err.text);
  }
  await next();
};