const { AppError } = require('../utils/error');

module.exports = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message
    });
  } 

  console.error("Unhandled error:", err);
  
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong'
  });

};