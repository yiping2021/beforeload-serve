const publicMethods = require("../publicMethods/index");

const { loadEngin } = publicMethods;

/**
 * @description 预加载引擎
 * @param {Object} req 包含
 * @param {Object} res
 */
async function getEngineIds(req, res) {
  console.log("请求参数", req.query);
  const { engineNum } = req.query;
  // 创建n最大预加载引擎
  await loadEngin(engineNum);
  res.json({
    code: 0,
    data: global.engineIds,
    msg: "创建引擎成功",
  });
}

module.exports = {
  getEngineIds,
};
