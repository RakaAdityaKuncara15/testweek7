const express = require('express');
const {
  Posts,
  Comments,
  Likes,
  sequelize,
  Sequelize,
  Users,
} = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');
const Joi = require('joi');
const { Op } = require('sequelize');

const router = express.Router();
const postSchema = Joi.object({
  title: Joi.string().required(),
  content: Joi.string().required(),
});

const RE_TITLE = /^[a-zA-Z0-9\s\S]{1,40}$/; //Post title regular expression
const RE_HTML_ERROR = /<[\s\S]*?>/; // Posts HTML Error Regular Expression
const RE_CONTENT = /^[\s\S]{1,3000}$/; // Post Content Regular Expression

router
  .route('/')
  // A function that returns all post data
  .get(async (req, res) => {
    try {
      const likes = await Likes.findAll();

      const postsQuery = `
                SELECT p.postId, u.userId, u.nickname, p.title, p.createdAt, p.updatedAt
                FROM Posts AS p
                JOIN Users AS u
                ON p.userId = u.userId
                ORDER BY p.postId DESC`;

      let posts = await sequelize.query(postsQuery, {
        type: Sequelize.QueryTypes.SELECT,
      });
      posts = posts.map((post) => {
        return {
          ...post,
          likes: likes.filter((like) => like.postId === post.postId).length,
        };
      });
      posts.sort((a, b) => b.createdAt - a.createdAt);

      return res.status(200).json({ data: posts });
    } catch (error) {
      console.log(`${req.method} ${req.originalUrl} : ${error.message}`);
      return res.status(400).json({
        errorMessage: 'Failed to retrieve post.',
      });
    }
  })

  //create opening post
  .post(authMiddleware, async (req, res) => {
    try {
      const resultSchema = postSchema.validate(req.body);
      if (resultSchema.error) {
        return res.status(412).json({
          errorMessage: 'The data format is incorrect.',
        });
      }

      const { title, content } = resultSchema.value;
      const { userId } = res.locals.user;

      if (
        !isRegexValidation(title, RE_TITLE) ||
        isRegexValidation(title, RE_HTML_ERROR)
      ) {
        return res.status(412).json({
          errorMessage: 'The format of the post title does not match.',
        });
      }
      if (!isRegexValidation(content, RE_CONTENT)) {
        return res.status(412).json({
          errorMessage: 'The format of the post content does not match.',
        });
      }

      await Posts.create({ userId, title, content });
      return res.status(201).json({ message: 'You have succeeded in writing a post.' });
    } catch (error) {
      console.log(`${req.method} ${req.originalUrl} : ${error.message}`);
      return res.status(400).json({
        errorMessage: 'Failed to write post.',
      });
    }
  });

router
  .route('/:postId')
  // Post detail lookup
  .get(async (req, res) => {
    try {
      const { postId } = req.params;

      const likes = await Likes.findAll({
        where: {
          [Op.and]: [{ postId }],
        },
      });

      const postQuery = `
                SELECT p.postId, u.userId, u.nickname, p.title, p.content, p.createdAt, p.updatedAt
                FROM Posts AS p
                JOIN Users AS u
                ON p.userId = u.userId
                WHERE p.postId = ${postId}
                ORDER BY p.postId DESC
                LIMIT 1`;

      const post = await sequelize
        .query(postQuery, {
          type: Sequelize.QueryTypes.SELECT,
        })
        .then((posts) => {
          const post = posts[0];

          return {
            ...post,
            likes: likes.filter((like) => like.postId === post.postId).length,
          };
        });

      const comments = await Comments.findAll({
        where: {
          [Op.and]: [{ postId }],
        },
      });
      return res.status(200).json({
        data: {
          ...post,
          comments,
        },
      });
    } catch (error) {
      console.log(`${req.method} ${req.originalUrl} : ${error.message}`);
      return res.status(400).json({
        errorMessage: 'Failed to retrieve post.',
      });
    }
  })

  //게시글 수정
  .put(authMiddleware, async (req, res) => {
    try {
      const resultSchema = postSchema.validate(req.body);
      if (resultSchema.error) {
        return res.status(412).json({
          errorMessage: 'The data format is incorrect.',
        });
      }

      const { postId } = req.params;
      const { title, content } = resultSchema.value;
      const { userId } = res.locals.user;

      if (
        !isRegexValidation(title, RE_TITLE) ||
        isRegexValidation(title, RE_HTML_ERROR)
      ) {
        return res.status(412).json({
          errorMessage: 'The format of the post title does not match.',
        });
      }
      if (!isRegexValidation(content, RE_CONTENT)) {
        return res.status(412).json({
          errorMessage: 'The format of the post content does not match.',
        });
      }

      const updateCount = await Posts.update(
        { title, content },
        { where: { postId, userId } }
      );

      if (updateCount < 1) {
        return res.status(401).json({
          errorMessage: 'The post was not properly edited.',
        });
      }
      return res.status(200).json({ message: 'Edited the post.' });
    } catch (error) {
      console.log(`${req.method} ${req.originalUrl} : ${error.message}`);
      return res.status(400).json({
        errorMessage: 'Failed to edit post.',
      });
    }
  })

  // delete post
  .delete(authMiddleware, async (req, res) => {
    try {
      const { postId } = req.params;
      const { userId } = res.locals.user;

      const post = await Posts.findByPk(postId);
      if (!post) {
        return res.status(404).json({
          errorMessage: 'The thread does not exist.',
        });
      }

      const deleteCount = await Posts.destroy({ where: { postId, userId } });

      if (deleteCount < 1) {
        return res.status(401).json({
          errorMessage: 'The post was not properly deleted.',
        });
      }

      return res.status(201).json({ message: 'Post deleted.' });
    } catch (error) {
      console.log(`${req.method} ${req.originalUrl} : ${error.message}`);
      return res.status(400).json({
        errorMessage: 'Failed to delete post.',
      });
    }
  });

function isRegexValidation(target, regex) {
  return target.search(regex) !== -1;
}

module.exports = router;
