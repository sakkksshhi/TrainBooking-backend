const cors = require('cors');
const { config } = require('../config');

const corsMiddleware = cors({
  origin: config.CORS_ORIGINs.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true
});

module.exports = { corsMiddleware };