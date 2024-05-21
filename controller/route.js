const express = require("express");
require("./engineManager");
const router = express.Router();

router.use(express.json()); // 处理post请求体需要的中间件

module.exports = router;
