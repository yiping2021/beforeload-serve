const { eventEmitterInstance } = require("../../eventEmitter");
const { forEach, map, filter } = require("lodash");
const { runPlayer } = require("../cloundMethods/index");
const destroyEngine = require("../cloundMethods/destroyEngine");
const _ = require("lodash");

// const cacheList = []; //缓存的引擎列表
let isProcess = false;

// 监听已开启的场景节点配置数据
eventEmitterInstance.on("updateCacheRenderNode", async (cacheList, configs) => {
  const stillExitList = map(configs, (config) => {
    return config.sceneId;
  });
  const notExitList = filter(cacheList, (cacheItem) => {
    return !stillExitList.includes(cacheItem.sceneId);
  });
  const cacheObj = groupedBySceneId(cacheList);

  if (isProcess) return;
  isProcess = true;
  if (notExitList?.length) {
    // 销毁该场景id全部节点
    forEach(notExitList, async (item) => {
      destroyEngine(item.player);
    });
  }
  for (let i = 0; i < configs?.length; i++) {
    isProcess = true;
    const result = await manageEngine(configs[i], cacheObj);
    if (result) {
      return;
    }
  }
  isProcess = false;
});

/**
 * @describe 将数组中相同场景id的节点分类
 * @param {Array} arr
 * @return {Object}
 */
function groupedBySceneId(arr) {
  return arr.reduce((acc, obj) => {
    if (acc[obj.sceneId]) {
      acc[obj.sceneId].push(obj);
    } else {
      acc[obj.sceneId] = [obj];
    }
    return acc;
  }, {});
}

async function manageEngine(config, targetObj) {
  // 获取后端存储的场景节点配置
  const {
    preloadedMinNodes: minNodes,
    preloadedMaxNodes: maxNodes,
    freeTimeNodes: idleNodes,
    sceneId,
  } = config;
  isProcess = true;
  //如果缓存记录的节点数小于最小节点数，创建新节点
  if (!targetObj[sceneId] || targetObj[sceneId]?.length < minNodes) {
    const res = await runPlayer(config);
    if (res) {
      //更新缓存集合
      const obj = { ...res, sceneId };
      targetObj[sceneId]?.push(obj);
      eventEmitterInstance.emit("updateCacheList", obj);
    }
    //更新完数据中止后续操作，重新处理
    isProcess = false;
    return true;
  }
  //缓存空闲节点数
  const cacheIdleNodes = filter(
    targetObj[sceneId],
    (node) => node.isDistribute === false
  );
  //如果缓存记录的空闲节点数小于配置空闲节点数且缓存当前节点数少于配置最大数
  if (
    cacheIdleNodes?.length < idleNodes &&
    targetObj[sceneId]?.length < maxNodes
  ) {
    const res = await runPlayer(config);
    if (res) {
      //更新缓存集合 todo
      const obj = { ...res, sceneId };
      targetObj[sceneId]?.push(obj);
      eventEmitterInstance.emit("updateCacheList", obj);
    }
    isProcess = false;
    return true;
  }

  /**
   * 配置信息修改后需要销毁的情况
   */

  // 如果缓存记录的总点数大于配置最大节点数，销毁多余空闲节点
  if (targetObj[sceneId]?.length > maxNodes) {
    const nodesToDesdroy = targetObj[sceneId]?.length - maxNodes;
    //确保实际销毁的节点数不超过目前的空闲节点数
    const nodesToDesdroyLimit = Math.min(
      nodesToDesdroy,
      cacheIdleNodes?.length
    );

    forEach(cacheIdleNodes.slice(-nodesToDesdroyLimit), (node) =>
      destroyEngine(node.player)
    );

    isProcess = false;
    return true;
  }

  // 如果缓存记录的空闲节点数大于配置空闲节点数，销毁多余空闲节点
  if (cacheIdleNodes?.length > idleNodes) {
    const nodesToDesdroy = cacheIdleNodes.length - idleNodes;
    forEach(cacheIdleNodes.slice(-nodesToDesdroy), (node) =>
      destroyEngine(node.player)
    );

    isProcess = false;
    return true;
  }

  isProcess = false;
}
