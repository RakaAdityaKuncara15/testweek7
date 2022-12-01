require('dotenv').config();

// If the user is logged in, an error is returned.
module.exports = (req, res, next) => {
  try {
    const cookies = req.cookies[process.env.COOKIE_NAME];
    if (cookies) {
      return res.status(403).send({
        errorMessage: 'You are already logged in.',
      });
    }

    next();
  } catch (error) {
    console.trace(error);
    return res.status(400).send({
      errorMessage: 'The wrong approach.',
    });
  }
};
