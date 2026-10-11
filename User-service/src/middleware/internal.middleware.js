const crypto = require('crypto');
const { config } = require('../config');
const { UnauthorizedError } = require('../utils/error');

exports.internalOnly = (req, res, next) => {
     const given = Buffer.from(req.headers['x-internal-key'] || '');
     const expected = Buffer.from(config.INTERNAL_API_KEY || '');

     if (!config.INTERNAL_API_KEY || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
          throw new UnauthorizedError('Internal access only');
     }
     next();
};