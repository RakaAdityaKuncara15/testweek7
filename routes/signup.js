const express = require('express');
const Joi = require('joi');
const { Users, sequelize, Sequelize } = require('../models');
const authLoginUserMiddleware = require('../middlewares/authLoginUserMiddleware');

const router = express.Router();

const re_nickname = /^[a-zA-Z0-9]{3,10}$/;
const re_password = /^[a-zA-Z0-9]{4,30}$/;

const userSchema = Joi.object({
  nickname: Joi.string().pattern(re_nickname).required(),
  password: Joi.string().pattern(re_password).required(),
  confirm: Joi.string(),
});

router.post('/', authLoginUserMiddleware, async (req, res) => {
  try {
    //The nickname must consist of 3 to 10 words with a-z A-Z 0-9 characters starting and ending.
    const { nickname, password, confirm } = await userSchema.validateAsync(
      req.body
    );

    if (password !== confirm) {
      return res.status(412).send({
        errorMessage: 'Passwords do not match.',
      });
    }
    if (nickname.search(re_nickname) === -1) {
      return res.status(412).send({
        errorMessage: 'The format of the ID does not match.',
      });
    }
    if (password.search(re_password) === -1) {
      return res.status(412).send({
        errorMessage: 'The password format does not match.',
      });
    }
    if (isRegexValidation(password, nickname)) {
      return res.status(412).send({
        errorMessage: 'Your password contains your nickname.',
      });
    }
    const user = await Users.findAll({
      attributes: ['userId'],
      where: { nickname },
    });

    if (user.length) {
      return res.status(412).send({
        errorMessage: 'This is a duplicate nickname.',
      });
    }
    //Even if you do not designate "CreateAt" and "UpdateAt", values are automatically entered.
    await Users.create({ nickname, password });
    console.log(`${nickname} has signed up`);

    return res.status(201).send({ message: 'You have successfully registered as a member.' });
  } catch (error) {
    console.log(`${req.method} ${req.originalUrl} : ${error.message}`);
    return res.status(400).send({
      errorMessage: 'The requested data format is not valid.',
    });
  }
});

function isRegexValidation(target, regex) {
  return target.search(regex) !== -1;
}

module.exports = router;
