const express = require('express');
const { Likes, Posts, sequelize, Sequelize } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router
  .route('/like')
  // Look up like posts
  .get(authMiddleware, async (req, res) => {
    try {
      const { userId } = res.locals.user;

      let userLikes = await Likes.findAll({
        where: { userId },
      });

      let likePostIdArray = getLikePostIdByLikes(userLikes);

      const postsQuery = `
                SELECT p.postId, u.userId, u.nickname, p.title, p.createdAt, p.updatedAt
                FROM Posts AS p
                JOIN Users AS u
                ON p.userId = u.userId
                ORDER BY p.postId DESC`;

      let posts = await sequelize
        .query(postsQuery, {
          type: Sequelize.QueryTypes.SELECT,
        })
        .then((posts) => getPostsByPostIdArray(likePostIdArray, posts));


      const getLikePostIdByLikes = (likes) => {
        let likePostIdArray = [];
        for (const like of likes) {
          likePostIdArray.push(like.postId);
        }

        return likePostIdArray;
      }

      const likes = await Likes.findAll();

      posts = posts.map((post) => {
        return {
          ...post,
          likes: likes.filter((like) => like.postId === post.postId).length,
        };
      });

      posts.sort((a, b) => b.createdAt - a.createdAt);
      posts.sort((a, b) => b.likes - a.likes);

      return res.status(200).json({
        data: posts,
      });
    } catch (error) {
      console.log(`${req.method} ${req.originalUrl} : ${error.message}`);
      return res.status(400).json({
        errorMessage: 'Failed to look up like posts.',
      });
    }
  });

router
  .route('/:postId/like')
  // 좋아요 업데이트
  .put(authMiddleware, async (req, res) => {
    try {
      const { postId } = req.params;
      const { userId } = res.locals.user;

      const isExist = await Posts.findByPk(postId);

      if (!isExist) {
        return res.status(404).json({
          errorMessage: 'The thread does not exist.',
        });
      }

      let isLike = await Likes.findOne({
        where: { postId, userId },
      });

      if (!isLike) {
        await Likes.create({ postId, userId });

        return res
          .status(200)
          .json({ message: 'Registered to like the post.' });
      } else {
        await Likes.destroy({
          where: { postId, userId },
        });

        return res
          .status(200)
          .json({ message: 'Unlike the post.' });
      }
    } catch (error) {
      console.log(`${req.method} ${req.originalUrl} : ${error.message}`);
      return res.status(400).json({
        errorMessage: 'Failed to like the post.',
      });
    }
  });



function getPostsByPostIdArray(postIdArray, posts) {
  return posts.filter((post) => {
    return postIdArray.includes(post.postId);
  });
}

module.exports = router;
