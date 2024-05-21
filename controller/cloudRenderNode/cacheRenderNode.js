const { eventEmitterInstance } = require("../../eventEmitter");
const _ = require("lodash");
const fs = require("fs").promises;

class CacheRenderNode {
  constructor() {
    this._cacheRenderNodeList = [];
    this.cacheRenderNodeList = [];
    this.sceneRenderSetting = [];
    this._sceneRenderSetting = [];
    this.cacheUpdateTimeBar = null;
    // 是否开启实时推送
    this.isStartCachePush = true;
    Object.defineProperty(this, "cacheRenderNodeList", {
      enumerable: true,
      configurable: true,
      get() {
        return this._cacheRenderNodeList;
      },
      set(value) {
        this.debounceEvent(value);
        // 数据变化推送至引擎实例创建、销毁端
        this._cacheRenderNodeList = value;
      },
    });
  }
  // 事件发送防抖
  debounceEvent = _.debounce(async function getProjectTypeList(value) {
    await CacheRenderNode.writeLastFileData(value);
    this.isStartCachePush &&
      eventEmitterInstance.emit(
        "updateCacheRenderNode",
        _.cloneDeep(value),
        _.cloneDeep(this.sceneRenderSetting)
      );
  }, 1500);

  // 初始化时获取当前已创建文件数据
  static async writeLastFileData(targetData = []) {
    if (_.isNil(targetData) || !_.isObject(targetData)) {
      targetData = [];
    }
    try {
      const filePath = "./public";
      await fs.writeFile(
        `${filePath}/cloudRenderData/cacheRenderData.json`,
        JSON.stringify(targetData)
      );
    } catch (err) {
      console.error("🚀 ~ CacheRenderNode ~ getProjectTypeList ~ err:", "err");
    }
  }
}

module.exports = new CacheRenderNode();
