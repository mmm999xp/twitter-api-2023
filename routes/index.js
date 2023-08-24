const express = require('express')
// 待確認，passport.authenticate 是他內建的，不是載入這個config裡的
// const { authenticate } = require('../config/passport')
const router = express.Router()
const passport = require('../config/passport')
// const admin = require('./modules/admin')
const { authenticated, authenticatedAdmin } = require('../middleware/api-auth')
const userController = require('../controllers/user-controller')
const { apiErrorHandler } = require('../middleware/error-handler')
const tweet = require('./modules/tweet')


// router.use('/admin', authenticated, authenticatedAdmin, admin)

// users
router.post('/users/signin', passport.authenticate('local', { session: false }), userController.signIn) // 登入
router.post('/users/', userController.signUp) // 註冊

// modules
router.use('/api/tweets', authenticated, tweet)

router.use('/', apiErrorHandler)
module.exports = router
