const RemotePlayer = require("../../static/player/Player");
/**
 * 预加载指定数量的引擎
 * @param {Number} num
 */
function loadEngin(num) {
  new RemotePlayer({
    video: "ddd", // 绑定视频标签
    signalServer: "ws://192.168.20.79:8082", // 信令服务器地址(player给提供都是ws)
    engineId: "dgefsfse", // 要连接的引擎ID
    autoResize: true, // 引擎是否跟时评标签尺寸
    userTimeout: 1000 * 60 * 60, // 用户操作超时设置，毫秒
    exitTimeout: 1000 * 60 * 1, // 用户超时后多久断开会话
    maxTimeout: 1000, // 会话超时时间，允许掉线后引擎保存多久，在该时间内可重新连接到会话，否则会创建新的会话
  });
  global.engineIds = ["222"];
}

module.exports = {
  loadEngin,
};
