const jwt = require('jsonwebtoken')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc') // 引入 UTC 套件
const timezone = require('dayjs/plugin/timezone') // 引入時區套件
const helper = require('../_helpers')
const { User, Tweet, Like } = require('../models')
dayjs.extend(utc) // 使用 UTC 套件
dayjs.extend(timezone) // 使用時區套件

const adminController = {
  signIn: (req, res, next) => {
    try {
      const userData = helper.getUser(req).toJSON()
      delete userData.password // 刪除密碼
      const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '30d' }) // 簽發 JWT，效期為 30 天
      res.status(200).json({
        status: 'success',
        message: `管理者${userData.account}已經成功登入!`,
        data: {
          token,
          user: {
            ...userData,
            updatedAt: dayjs(userData.updatedAt).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss'),
            createdAt: dayjs(userData.createdAt).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')
          }
        }
      })
    } catch (err) {
      next(err)
    }
  },
  getUsers: (req, res, next) => {
    return User.findAll({
      nest: true,
      // raw: true, 因為使用raw時 sequelize無法正確取得關聯資料
      attributes: ['id', 'account', 'name', 'avatar', 'banner'], // 不載入password
      include: [
        { model: User, as: 'Followers', attributes: ['id'] },
        { model: User, as: 'Followings', attributes: ['id'] },
        { model: Tweet, attributes: ['id'] },
        { model: Like, attributes: ['id'] }
      ]
    })
      .then(users => {
        users = users.map(user => {
          return {
            id: user.id,
            account: user.account,
            name: user.name,
            avatar: user.avatar,
            banner: user.banner,
            tweetCounts: user.Tweets.length,
            likeCounts: user.Likes.length,
            followingCounts: user.Followings.length,
            followerCounts: user.Followers.length
          }
        })
        return users
      })
      .then(users => res.status(200).json(users))
      .catch(err => next(err))
  }
}
module.exports = adminController
