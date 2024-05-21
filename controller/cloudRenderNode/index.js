const express = require("express");
const CloudRenderNodeController = require("./cloudRenderNodeController");
const router = express.Router();
const { distributeNode, getSceneDistributeList } = CloudRenderNodeController;
const { eventEmitterInstance } = require("../../eventEmitter");

// 初始化定时器
CloudRenderNodeController.initCacheRenderNode(true);
eventEmitterInstance.on(
  "updateCacheList",
  CloudRenderNodeController.createSceneEngine
);

router.get("/cloud-render-node/distribute-node", distributeNode);
router.get(
  "/cloud-render-node/get-scene-distribute-list/:id",
  getSceneDistributeList
);

module.exports = router;
