const jwt = require('jsonwebtoken');
const { Users } = require('../models');
require('dotenv').config();

// If user authentication fails, a 403 status code is returned.
module.exports = async (req, res, next) => {
  try {
    const cookies = req.cookies[process.env.COOKIE_NAME];
    if (!cookies) {
      return res.status(403).send({
        errorMessage: 'This feature requires login.',
      });
    }

    const [tokenType, tokenValue] = cookies.split(' ');
    if (tokenType !== 'Bearer') {
      return res.status(403).send({
        errorMessage: 'An error occurred in the forwarded cookie.',
      });
    }

    const { userId } = jwt.verify(tokenValue, process.env.SECRET_KEY);
    const user = await Users.findByPk(userId);

    res.locals.user = user;
    next();
  } catch (error) {
    console.trace(error);
    return res.status(403).send({
      errorMessage: 'This feature requires login.',
    });
  }
};
