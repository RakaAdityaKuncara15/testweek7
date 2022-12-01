const express = require('express');
const { Comments, sequelize, Sequelize } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');
const authUserMiddleware = require('../middlewares/authUserMiddleware');
const Joi = require('joi');

const router = express.Router();

const RE_COMMENT = /^[\s\S]{1,100}$/; // Comment regular expression

const commentSchema = Joi.object({
  comment: Joi.string().pattern(RE_COMMENT).required(),
});

router
  .route('/:postId')
  //View comment list
  .get(authUserMiddleware, async (req, res) => {
    try {
      const { postId } = req.params;

      const commentsQuery = `
                SELECT c.commentId, c.userId, u.nickname, c.comment, c.createdAt, c.updatedAt
                FROM Comments AS c
                JOIN Users AS u
                ON c.userId = u.userId 
                WHERE c.postId = ${postId}`;

      const comments = await sequelize.query(commentsQuery, {
        type: Sequelize.QueryTypes.SELECT,
      });

      comments.sort((a, b) => b.createdAt - a.createdAt);

      return res.status(200).json({ data: comments });
    } catch (error) {
      console.log(`${req.method} ${req.originalUrl} : ${error.message}`);
      return res.status(400).json({
        errorMessage: 'Comment search failed.',
      });
    }
  })
  //create comment
  .post(authMiddleware, async (req, res) => {
    try {
      const resultSchema = commentSchema.validate(req.body);
      if (resultSchema.error) {
        return res.status(412).json({
          errorMessage: 'The data format is incorrect.',
        });
      }

      const { postId } = req.params;
      const { comment } = resultSchema.value;
      const { userId } = res.locals.user;

      await Comments.create({ postId, userId, comment });
      return res.status(201).json({ message: 'You wrote a comment.' });
    } catch (error) {
      console.log(`${req.method} ${req.originalUrl} : ${error.message}`);
      return res.status(400).json({
        errorMessage: 'Failed to write a comment.',
      });
    }
  });

router
  .route('/:commentId')
  // edit comment
  .put(authMiddleware, async (req, res) => {
    try {
      const resultSchema = commentSchema.validate(req.body);
      if (resultSchema.error) {
        return res.status(412).json({
          errorMessage: 'The data format is incorrect.',
        });
      }

      const { commentId } = req.params;
      const { comment } = resultSchema.value;
      const { userId } = res.locals.user;

      const isExist = await Comments.findByPk(commentId);
      if (!isExist) {
        return res.status(404).json({
          errorMessage: 'Comments do not exist.',
        });
      }

      const updateCount = await Comments.update(
        { comment },
        { where: { commentId, userId } }
      );

      if (updateCount < 1) {
        return res.status(400).json({
          errorMessage: 'Comment editing was not handled properly.',
        });
      }

      return res.status(200).json({ message: 'Edited comment.' });
    } catch (error) {
      console.log(`${req.method} ${req.originalUrl} : ${error.message}`);
      return res.status(400).json({
        errorMessage: 'Failed to edit comment.',
      });
    }
  })
  // delete comment
  .delete(authMiddleware, async (req, res) => {
    try {
      const { commentId } = req.params;
      const { userId } = res.locals.user;

      const isExist = await Comments.findByPk(commentId);
      if (!isExist) {
        return res.status(404).json({
          errorMessage: 'Comments do not exist.',
        });
      }

      const deleteCount = await Comments.destroy({
        where: { commentId, userId },
      });

      if (deleteCount < 1) {
        return res.status(400).json({
          errorMessage: 'Comment deletion was not handled properly.',
        });
      }

      return res.status(200).json({ message: 'Comment deleted.' });
    } catch (error) {
      console.log(`${req.method} ${req.originalUrl} : ${error.message}`);
      return res.status(400).json({
        errorMessage: 'Failed to delete comment.',
      });
    }
  });

module.exports = router;
