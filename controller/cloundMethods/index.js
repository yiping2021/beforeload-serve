const RemotePlayer = require("../../static/player/Player");
const config = require("../../public/config/settings.json");
const setPreferenceSettings = require("./preferenceSettings");
const loadScene = require("./loadScene");
const { forEach } = require("lodash");

// 生成uuid
function generateUUID() {
  let d = new Date().getTime();
  if (this.performance && typeof this.performance.now === "function") {
    d += performance.now();
  }
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
  return uuid;
}
// 移动相机到经纬度
async function moveToLLH(long, lat) {
  if (long && lat) {
    const elevation = (
      await player.Native.GisPlatform.queryDEM([[long, lat, 0]])
    )[0];
    player.Native.Camera.addMoveToLLH([long, lat, 20000], 0);
    player.Native.Camera.addMoveToLLH([long, lat, elevation + 800], 8);
  }
}
// 监听模型加载完成
const checkModelLoadEnd = (data) => {
  console.log("模型加载完成", data);
  player.Native.Model.EventProgressEnd.disconnect(checkModelLoadEnd);
};
/**
 * 初始化预加载场景
 * @param {*} sceneInfo
 * @returns
 */
async function runPlayer(sceneInfo) {
  global.engineData = null;
  const initPromise = new Promise((resolve) => {
    const engineId = generateUUID();
    // 创建RemotePlayer对象
    const player = new RemotePlayer({
      video: "img", // 绑定标签
      signalServer: config.cloundServerPath, // 信令服务器地址(player给提供都是ws)
      engineId, // 要连接的引擎ID
      autoResize: true, // 引擎是否跟时评标签尺寸
      userTimeout: 1000 * 60 * 60, // 用户操作超时设置，毫秒
      exitTimeout: 1000 * 60 * 1, // 用户超时后多久断开会话
      maxTimeout: 1000 * 60 * 60 * 24 * 23, // 会话超时时间，允许掉线后引擎保存多久，在该时间内可重新连接到会话，否则会创建新的会话
    });
    // global.engineIds.push(engineId);
    // 当前是否再在尝试重新连接player
    let reconnect = false;
    // 重连的计时器
    let reconnectTimer = null;
    // 重连次数（对应了初始化player中的maxTimeout）
    let reconnectTime = 0;
    // 监听实例化完成后
    player.on("NativeLoad", async () => {
      console.log("NativeLoad111");
      if (reconnect) {
        reconnect = false;
        reconnectTime = 0;
        clearInterval(reconnectTimer);
        return;
      }
      global.engineData = {
        engineId,
        player,
      };
      player.Native.Settings.set("sys.autoUpdateFrame", "bool", false);
      // 设置点选时其他节点半透明
      player.Native.Settings.set("color.pickup.bkAlpha", "float", "0.5");
      player.Native.Settings.set("viewcube.offset.y", "int", 100);
      const settingsFileUrl = `data://../apps/${config.folderName}/settings.json`;
      const settingsData = await player.Native.Settings.loadJsonString(
        settingsFileUrl
      );
      if (settingsData) {
        const defaultSettings = JSON.parse(settingsData);
        forEach(defaultSettings.Show, (item) => {
          player.Native.Settings.set(item.name, item.type, item.value);
        });
      }
      // 获取到经纬度添加地图
      if (sceneInfo.isEnableGis) {
        await player.Native.GisPlatform.loadMap(config.globalMapPath);
        moveToLLH(sceneInfo.longitude, sceneInfo.latitude);
      }
      // 偏好设置处理
      // setPreferenceSettings(sceneInfo.userPreferenceSettings, player);

      console.log("开始加载场景");
      await loadScene(player, sceneInfo);
      resolve();
    });
    // 监听连接失败消息
    player.on("Disconnected", (e) => {
      if (e === "webrtc channel closed") {
        reconnect = true;
        player.reconnect();
        if (reconnectTimer) {
          clearInterval(reconnectTimer);
        }
        reconnectTimer = setInterval(() => {
          if (reconnectTime < 60 && reconnect) {
            reconnectTime += 1;
          } else {
            console.log("webrtc channel closed");
            resolve();
            player.exit();
            clearInterval(reconnectTimer);
          }
        }, 1000);
      } else if (e === "signal websocket error") {
        // websorket reconnect 连接失败
        if (!reconnect || reconnectTime >= 60) {
          console.log("signal websocket error");
          resolve();
          clearInterval(reconnectTimer);
        } else {
          player.reconnect();
        }
      }
    });
  });
  await initPromise;
  return global.engineData;
}

module.exports = {
  runPlayer,
};
