const { User, Followship } = require('../models')
const helpers = require('../_helpers')

const followshipController = {
  addFollowing: (req, res, next) => {
    const followingId = Number(req.body.id) // 當下按的使用者
    const UserId = helpers.getUser(req).id // 登入使用者 ID
    
    // 確認被追蹤使用者是否存在
    if (!followingId) {
        return res.status(400).json({
          status: 'error',
          message: 'Following id is required!'
        })
      }

    // 不能按自己讚
    if (followingId === UserId) {
        return res.status(422).json({
          status: 'error',
          message: '使用者不可以追蹤自己.'
        })
      }

      return Promise.all([
        User.findByPk(followingId),
        Followship.findOne({
          where: {
            followerId: UserId,
            followingId
          }
        })
      ])
      .then(([user, followship]) => {
      
        // 確認使用者是否存在
      if (!user || user.role === 'admin') {
        return res.status(404).json({
          status: 'error',
          message: '使用者不存在.'
        })
      }

      // 確認是否已經按過追蹤
      if (followship) {
        return res.status(422).json({
          status: 'error',
          message: '你已經追蹤過了!'
        })
      }

      return Followship.create({
        followerId: UserId,
        followingId
        })
      })
      .then(() => res.status(200).json({
        status: 'success'
      }))
      .catch(err => next(err))
  }
}

module.exports = followshipController