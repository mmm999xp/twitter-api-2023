const { Tweet, User, Like, Reply, sequelize } = require('../models')
// const { getUser } = require('../_helpers')
const helpers = require('../_helpers')
const { relativeTimeFromNow, simpleDate, simpleTime } = require('../helpers/datetime-helper')

const tweetController = {
  // 看所有貼文
  getTweets: (req, res, next) => {
    const loginUserId = helpers.getUser(req).id
    return Tweet.findAll({
      nest: true,
      raw: true,
      include: {
        model: User,
        attributes: ['id', 'name', 'avatar', 'account']
      },
      attributes: [
        'id',
        'description',
        'UserId',
        'createdAt',
        [sequelize.literal('(SELECT COUNT(id) FROM Replies WHERE Replies.TweetId = Tweet.id)'), 'replyCount'],
        [sequelize.literal('(SELECT COUNT(id) FROM Likes WHERE Likes.TweetId = Tweet.id)'), 'likeCount'],
        [sequelize.literal(`EXISTS (SELECT id FROM Likes WHERE Likes.UserId = ${loginUserId} AND Likes.TweetId = Tweet.id)`), 'isLiked']
      ],
      order: [['createdAt', 'DESC']]
    })

    .then(data => {
      // console.log(data)
      return data.map(tweet => ({
        ...tweet,
        createdAt : relativeTimeFromNow(tweet.createdAt)
      }))
    })

    .then(tweet => res.status(200).json(tweet))
    .catch(err => next(err))
  },
  // 新增一筆貼文
  postTweet: (req, res, next) => {
    const limitWords = 140
    const { description } = req.body

    const loginUserId = helpers.getUser(req).id


    if (!loginUserId) {
      return res.status(404).JSON({
          status: 'error',
          message: '帳號不存在',
        })
    }

    if (!description.trim())  {
      return res.status(400).JSON({
          status: 'error',
          message: '內容不可空白',
        })
    }

    if (description.length > limitWords ) {
      return res.status(413).JSON({
          status: 'error',
          message: `字數不能大於 ${limitWords} 字`,
        })
    }
    
    return Tweet.create({
      description,
      UserId: loginUserId,
    })

    .then( tweet => {
      return res.status(200).json(tweet)

    })
    .catch(err => next(err))
  },
  // 瀏覽一筆貼文
  getTweet: (req, res, next) => {
    const loginUserId = helpers.getUser(req).id
    const TweetId = Number(req.params.id)
    if (!loginUserId) {
      return res.status(404).JSON({
          status: 'error',
          message: '帳號不存在',
        })
    }

    return Tweet.findByPk(TweetId, {
      include: 
        {
          model: User,
          attributes: ['id', 'name', 'avatar', 'account']
        },
      attributes: [
          'id',
          'UserId',
          'createdAt',
          'description',
          [sequelize.literal('(SELECT COUNT(*) FROM Replies WHERE Replies.TweetId = Tweet.id)'), 'replyCount'],
          [sequelize.literal('(SELECT COUNT(*) FROM Likes WHERE Likes.TweetId = Tweet.id)'), 'likeCount'],
          [sequelize.literal(`EXISTS (SELECT id FROM Likes WHERE Likes.UserId = ${loginUserId} AND Likes.TweetId = Tweet.id)`), 'isLiked']
        ],
        raw: true,
        nest:true
    })
    .then(tweet => {
      if (!tweet) {
        return res.status(404).JSON({
          status: 'error',
          message: '推文不存在',
        })
      }

      tweet.createdAt = simpleTime(tweet.createdAt) + ' • ' + simpleDate(Tweet.createdAt)
      return res.status(200).json(tweet)   
    })
    .catch(err => next(err))
  },
  // 按讚一筆貼文
  likeTweet: (req, res, next) => {
    const TweetId = Number(req.params.id)
    const UserId = helpers.getUser(req).id

    return Promise.all([
      Tweet.findByPk(TweetId, {
        attributes: [
          'id',
          'UserId',
          'createdAt'
        ]
      }),
      Like.findOrCreate({ // 陣列第 1 項回傳 true or false`, 沒資料就建立
        where: { UserId, TweetId}
      })
    ])
    .then(([tweet, like]) => {
        if (!tweet) {
          return res.status(404).json({
            status:'error',
            message: '推文不存在'
          })
        }
        if (!like[1]) {
        return res.status(422).json({
          status: 'error',
          message: '已表示喜歡'
          })
        }
        
        return res.status(200).json(tweet)

    })
    .catch(err => next(err))
  },
  // 對一筆貼文收回讚
  unlikeTweet: (req, res, next) => {
    const UserId = helpers.getUser(req).id
    const TweetId = Number(req.params.id)

    Tweet.findByPk(TweetId, {
      attributes: [
        'id',
        'UserId',
        'createdAt'
      ]
    })
      .then(tweet => {
        if (!tweet) {
          return res.status(404).json({
            status: 'error',
            message: '推文不存在'
          })
        }

        Like.destroy({ where: { UserId, TweetId } })
          .then(like => {
            if (!like) {
              return res.status(422).json({
                status: 'error',
                message: '未表示喜歡'
              })
            }
            return res.status(200).json(tweet)
          })
          .catch(err => next(err))
      })
      .catch(err => next(err))
  },
  // 看貼文全部回覆
  getReplies: (req, res, next) => {
    const TweetId = Number(req.params.id)
    return Reply.findAll({
        raw: true,
        nest: true,
        where: { TweetId },
        attributes: ['id', 'comment', 'createdAt', 'UserId', 'TweetId'],
        include: {
          model: User,
          attributes: ['id', 'avatar', 'account', 'name']
        },
        order: [['createdAt', 'DESC'], ['id', 'ASC']]
      })
    .then(replies => replies.map( reply => ({
      ...reply,
      createdAt: relativeTimeFromNow(reply.createdAt)
    })))
    .then((data) => res.status(200).json(data))
    .catch(err => next(err))
  },
  // 回覆一筆貼文
  postReply: (req, res, next) => {
    const limitWords = 140
    const TweetId = Number(req.params.id)
    const UserId = helpers.getUser(req).id
    const { comment } = req.body

    return Tweet.findByPk(TweetId, {
      raw: true,
      nest: true
    })
    .then(tweet => {
      if (!tweet) {
          return res.status(404).json({
            status: 'error',
            message: '推文不存在'
          })
        }

      if (!comment.trim()) {
      return res.status(400).JSON({
          status: 'error',
          message: '內容不可空白',
        })
    }

      if (comment.length > limitWords)  {
      return res.status(413).JSON({
          status: 'error',
          message: `字數不能大於 ${limitWords} 字`,
        })
    }

      return Reply.create({
          comment,
          UserId,
          TweetId
        })
    })
    .then((data) => res.status(200).json(data))
    .catch(err => next(err))
  }
}

module.exports = tweetController
