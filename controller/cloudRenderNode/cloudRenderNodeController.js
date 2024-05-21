const _ = require("lodash");
const axios = require("axios");
const cacheRenderNode = require("./cacheRenderNode");
const config = require("../../public/config/settings.json");
const fs = require("fs").promises;

// 添加监听器来监听'event'事件
class CloudRenderNodeController {
  // 初始化缓存状态
  static async initCacheRenderNode(isInit = false) {
    try {
      let resultList = [];
      if (isInit) {
        resultList = await CloudRenderNodeController.getLastFileData();
      }
      // 清除定时器
      clearInterval(cacheRenderNode.cacheUpdateTimeBar);
      // 默认更新一次
      CloudRenderNodeController.updateCacheRenderNode(resultList);
      await CloudRenderNodeController.destroyEmptyRenderNode(resultList);
      cacheRenderNode.cacheUpdateTimeBar = setInterval(() => {
        CloudRenderNodeController.updateCacheRenderNode();
      }, 2000);
    } catch (error) {
      console.error(
        "🚀 ~ CloudRenderNodeController ~ initCacheRenderNode ~ error:",
        "error"
      );
    }
  }

  // 销毁node退出异常
  static async destroyEmptyRenderNode(cacheList = []) {
    try {
      // 获取所有空客户端节点
      const allCloudRendSetting =
        await CloudRenderNodeController.getAllCloudRendSetting();
      if (!_.isObject(allCloudRendSetting.data)) {
        return;
      }
      const destroyRenderList = [];
      _.forIn(allCloudRendSetting.data, (value, key) => {
        if (_.isEmpty(_.keys(value.clients))) {
          destroyRenderList.push(key);
        }
      });
      // 单线销毁云渲染引擎
      while (!_.isEmpty(destroyRenderList)) {
        const currentDestroyEnginId = destroyRenderList.pop();
        const result = await CloudRenderNodeController.destroyRenderLoadById(
          currentDestroyEnginId
        );
        if (!result) {
          const destoryTarget = _.find(cacheList, [
            "engineId",
            currentDestroyEnginId,
          ]);
          destoryTarget?.player && (await destoryTarget.player?.exit());
        }
      }
    } catch (error) {
      console.error(
        "🚀 ~ CloudRenderNodeController ~ destroyEmptyRenderNode ~ error:",
        "error"
      );
    }
  }

  // 初始化时获取当前已创建文件数据
  static async getLastFileData() {
    try {
      const filePath = "./public";
      await CloudRenderNodeController.initFileDir();
      const cacheRenderData = await fs.readFile(
        `${filePath}/cloudRenderData/cacheRenderData.json`,
        "utf8"
      );
      return JSON.parse(cacheRenderData);
    } catch (err) {
      console.error("🚀 ~ CacheRenderNode ~ getProjectTypeList ~ err:", "err");
      return [];
    }
  }

  // 创建缓存文件
  static async initFileDir() {
    try {
      const filePath = "./public";
      const files = await fs.readdir(filePath, { withFileTypes: true });
      const targetIndex = _.indexOf(_.map(files, "name"), "cloudRenderData");
      if (_.eq(targetIndex, -1)) {
        await fs.mkdir(`${filePath}/cloudRenderData`, { recursive: true });
      }
      const cloudRenderDataFileList = await fs.readdir(
        `${filePath}/cloudRenderData`,
        {
          withFileTypes: true,
        }
      );
      const cloudRenderDataTargetIndex = _.indexOf(
        _.map(cloudRenderDataFileList, "name"),
        "cacheRenderData.json"
      );
      if (_.eq(cloudRenderDataTargetIndex, -1)) {
        await fs.writeFile(
          `${filePath}/cloudRenderData/cacheRenderData.json`,
          JSON.stringify([])
        );
      }
    } catch (error) {
      console.error(
        "🚀 ~ CloudRenderNodeController ~ initFileDir ~ error:",
        "error"
      );
    }
  }

  // 更新缓存数据
  static async updateCacheRenderNode(resultList = []) {
    try {
      const result = await Promise.all([
        CloudRenderNodeController.getAllCloudRendSetting(),
        CloudRenderNodeController.getListAsyncAllowAnonymous(),
      ]);
      const [renderList, anonymousList] = _.map(result, "data");
      // 获取当前存在场景id
      const allowAnonymousIds = _.map(
        _.filter(anonymousList, ["isActive", true]),
        "sceneId"
      );
      // 获取当前已加载引擎id
      const openRenderIds = _.keys(renderList);
      // 更新当前全部云渲染节点
      cacheRenderNode.sceneRenderSetting = _.filter(anonymousList, [
        "isActive",
        true,
      ]);
      // 更新当前云渲染节点缓存
      cacheRenderNode.cacheRenderNodeList = _.filter(
        _.isEmpty(resultList)
          ? cacheRenderNode.cacheRenderNodeList
          : resultList,
        (item) => {
          return (
            _.includes(allowAnonymousIds, item.sceneId) &&
            _.includes(openRenderIds, item.engineId)
          );
        }
      );
      return { renderList, anonymousList };
    } catch (error) {
      console.error(
        "🚀 ~ CloudRenderNodeController ~ updateCacheRenderNode ~ error:",
        "error"
      );
    }
  }

  // 根据创建引擎绑定场景
  static async createSceneEngine(createdList = {}) {
    try {
      cacheRenderNode.isStartCachePush = false;
      // 获取推送数据
      const { engineId, sceneId, player } = createdList;
      // 取消定时器, 等待一次默认更新
      const { renderList, anonymousList } =
        await CloudRenderNodeController.updateCacheRenderNode();
      const isExisted = _.some(cacheRenderNode.cacheRenderNodeList, [
        "engineId",
        engineId,
      ]);
      const settingConfig = _.find(anonymousList, (item) => {
        return item.isActive && _.eq(item.sceneId, sceneId);
      });
      const engineConfig = renderList[engineId];
      if (isExisted && !settingConfig && !engineConfig) {
        return;
      }
      cacheRenderNode.isStartCachePush = true;
      cacheRenderNode.cacheRenderNodeList.push({
        ...settingConfig,
        ...engineConfig,
        engineId,
        sceneId,
        player,
        isDistribute: false,
      });
    } catch (error) {
      cacheRenderNode.isStartCachePush = true;
      console.error(
        "🚀 ~ CloudRenderNodeController ~ createSceneEngine ~ error:",
        "error"
      );
    }
  }

  // 分配空闲节点
  static async distributeNode(req, res) {
    const { sceneId, trueName } = req.query;
    try {
      const targetIndex = _.findIndex(
        cacheRenderNode.cacheRenderNodeList,
        (item) => {
          return !item.isDistribute && _.eq(item.sceneId, sceneId);
        }
      );
      const targetItem = cacheRenderNode.cacheRenderNodeList[targetIndex];
      // 当前可分配引擎
      if (!targetItem) {
        return res.json({
          code: 200,
          message: "当前无可分配引擎",
          data: {},
        });
      }
      _.set(cacheRenderNode.cacheRenderNodeList, `${[targetIndex]}`, {
        ...targetItem,
        isDistribute: true,
        trueName,
      });
      res.json({
        code: 200,
        message: "引擎分配成功",
        data: cacheRenderNode.cacheRenderNodeList[targetIndex],
      });
    } catch (error) {
      console.error(
        "🚀 ~ CloudRenderNodeController ~ distributeNode ~ error:",
        "error"
      );
    }
  }

  // 获取场景下已创建列表
  static async getSceneDistributeList(req, res) {
    const { id } = req.params;
    if (!id) {
      return res.json({
        code: 200,
        message: "请传入场景id",
        data: [],
      });
    }
    try {
      let matchedList = cacheRenderNode.cacheRenderNodeList;
      if (!_.eq(id, "all")) {
        matchedList = _.filter(matchedList, ["sceneId", id]);
      }
      res.json({
        code: 200,
        message: "查询成功",
        data: _.map(matchedList, (item) => {
          return _.omit(item, ["player"]);
        }),
      });
    } catch (error) {
      console.error(
        "🚀 ~ CloudRenderNodeController ~ getSceneDistributeList ~ error:",
        "error"
      );
    }
  }

  // 获取当前配置场景
  static async getAllCloudRendSetting() {
    return axios.get(
      `${config.cloudServerHttpPath}/sessions?t=${new Date().valueOf()}`
    );
  }

  // 获取当前已连接云渲染服务全部节点数据
  static async getListAsyncAllowAnonymous() {
    return axios.get(
      `${config.serveHttpPath}/api/cloud-render-management/cloud-render-nodeses/get-list-async-allow-anonymous`
    );
  }

  // 销毁引擎节点
  static async destroyRenderLoadById(id) {
    if (!id) {
      return Promise.resolve(false);
    }
    try {
      await axios.get(`${config.cloudServerHttpPath}/kill?id=${id}`);
      return Promise.resolve(true);
    } catch (error) {
      return Promise.resolve(false);
    }
  }
}

module.exports = CloudRenderNodeController;
