const { cloneDeep, last, isEmpty } = require("lodash");
const downloadFile = require("./modelDownload");
const { fileBasePath } = require("../../public/config/settings.json");

const EnumObjectTypes = [
  "modelFile", // 模型类型
  "dynamicEffects",
];
let loadPercentage = 0;
let sceneFileCount = 0;
let player = null;
let sceneData = null;
let sceneRootNode = null;
let seneBaseInfo = null;
let sceneFileList = [];
// let myResolve = () => {};

const isJSONObj = (str) => {
  if (typeof str === "string") {
    try {
      const obj = JSON.parse(str);
      if (typeof obj === "object" && obj && Object.keys(obj).length) {
        // typeof null 也为 object
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  return false;
};
// 监听下载进度
function progressMsg(file, bytesReceived, bytesTotal) {
  if (bytesTotal) {
    loadPercentage = (bytesReceived / bytesTotal) * 100;
  }
}
// 监听下载模型是否成功
function downloadMsg(file, err) {
  loadPercentage = 0;
  // this.showLoadProgress = false
  if (err) {
    console.log(`下载文件失败，${file}, ${err}`);
    // this.$message.warning(`下载文件失败，${file}, ${err}`)
  }
  // 模型下载完成
  sceneFileCount += 1;
  addModel();
}
// 监听模型加载进度
function checkModelLoad(data, node, name) {
  // const modelList = _.filter(this.sceneFileList, (item) => {
  //   return (
  //     item.code &&
  //     item.code?.type === 'modelFile' &&
  //     _.last(item.code?.filePath.split('.')) === 'pr'
  //   )
  // })
  if (data >= 1) {
    console.log("加载成功");
    player.Native.Model.EventProgress.disconnect(checkModelLoad);
    // this.loadedModels.push(name)
  }
  // this.loadPercentage = _.round((_.uniq(this.loadedModels).length / modelList.length) * 100, 2)
}
// 监听模型加载完成
const checkModelLoadEnd = (data) => {
  console.log("模型加载完成", data);
  player.Native.Model.EventProgressEnd.disconnect(checkModelLoadEnd);
};
// 加载模型
async function addModel() {
  player.Native.Model.EventProgress.connect(checkModelLoad);
  player.Native.Model.EventProgressEnd.connect(checkModelLoadEnd);
  const nodeList = await loadSceneFromJson(
    sceneData,
    sceneRootNode,
    player,
    seneBaseInfo,
    []
  );
  // sceneData, sceneRootNode, player, sceneInfo, []
  if (sceneData.cameraParams && isJSONObj(sceneData.cameraParams)) {
    const { eye, target, up } = JSON.parse(sceneData.cameraParams);
    await player.Native.Camera.moveTo(eye, target, up, 2);
  } else if (seneBaseInfo.isEnableGis) {
    await moveToLLH(seneBaseInfo.longitude, seneBaseInfo.latitude);
  } else {
    const currentNodes = _.map(
      _.filter(nodeList, ["type", "modelFile"]),
      "nodePtr"
    );
    await moveToScene(currentNodes, 1);
  }
  if (sceneFileCount < sceneFileList.length) {
    checkTextureFile(this.sceneFileList[sceneFileCount]);
  } else {
    console.log("加载全部模型完成");
    // myResolve();
  }
}
// 加载模型
const loadModel = async (file, name, parentNode, player) => {
  const modelNode = await player.Native.NodeProxy.loadModelNode(
    parentNode,
    file,
    name
  );
  return modelNode;
};
// 加载模型
const loadPrModel = async (file, name, parentNode) => {
  await player.Native.Model.loadModel(name, file);
  const modelInfo = await player.Native.Model.getInfo(name);
  await player.Native.NodeProxy.setNodeParent(modelInfo.nodePtr, parentNode);
  return modelInfo.nodePtr;
};
// 加载粒子节点
const loadParticle = async (file, name, parentNode, player) => {
  const particleNode = await player.Native.ParticleEffekseer.createParticle(
    file
  );
  await player.Native.NodeProxy.setNodeInfo(particleNode, { name });
  await player.Native.NodeProxy.setNodeParent(particleNode, parentNode);
  return particleNode;
};
// 检查模型是否存在
async function checkModelFile(data) {
  const fileType = last(data.code.filePath.split(".")) || "pr";
  const url = data.code.filePath;
  const fileInfo = {
    id: data.code.modelFileId,
    url,
    fileType,
  };
  const apiConfig = {
    path: `${fileBasePath}/api/file-management/files/public/${data.code.materialFileId}/download`,
    method: "GET",
    headers: {
      Authorization: `Bearer `,
    },
  };
  const res = await downloadFile(
    player,
    fileInfo,
    apiConfig,
    progressMsg,
    downloadMsg
  );
  if (res.type === 0 && res.success) {
    // 有模型就加载模型
    sceneFileCount += 1;
    addModel();
  } else {
    // this.showLoadProgress = true
    // this.loadType = '下载中...'
  }
}
// 监听下载模型是否成功
function downloadMaterialMsg(data) {
  const fun = async (file, err) => {
    // that.showLoadProgress = false
    loadPercentage = 0;
    if (err) {
      console.log(`下载贴图文件失败，${file}, ${err}`);
      // that.$message.warning(`下载贴图文件失败，${file}, ${err}`)
    }
    setTimeout(() => {
      checkModelFile(data);
    }, 1500);
  };
  return fun;
}
const loadSceneFromJson = async (
  obj,
  parentNode,
  player,
  sceneOptions = {
    isEnableGis: false,
    latitude: 0,
    longitude: 0,
  },
  nodes = []
) => {
  // const fileType = obj.code.fileType
  let node = null;
  // 根据节点类型，序列化某些特有类型的节点数据
  switch (obj.code.type) {
    case "modelFile":
      const fileType = last(obj.code.filePath.split("."));
      if (fileType === "pr") {
        node = await loadPrModel(obj.code.filePath, obj.code.id, parentNode);
      } else {
        node = await loadModel(obj.code.filePath, obj.name, parentNode, player);
      }
      break;
    case "dynamicEffects":
      node = await loadParticle(
        obj.code.filePath,
        obj.name,
        parentNode,
        player
      );
      break;
    default:
      // 层级节点，直接根据名称创建节点
      node = await player.Native.NodeProxy.createNode(parentNode, obj.name);
      break;
  }
  nodes.push({ type: obj.code.type, nodePtr: node });
  // 节点创建失败，返回nullptr
  if (node !== null && node !== 0) {
    if (obj.code.type === "Root" && !sceneOptions.isEnableGis) {
      obj.code.isEnableGis = false;
      await player.Native.NodeProxy.setLocalTranslation(node, [0, 0, 0]);
    } else if (
      obj.code.type === "Root" &&
      sceneOptions.isEnableGis &&
      sceneOptions.longitude &&
      sceneOptions.latitude
    ) {
      const elevation = (
        await player.Native.GisPlatform.queryDEM([
          [sceneOptions.longitude, sceneOptions.latitude, 0],
        ])
      )[0];
      await player.Native.NodeProxy.setNodeGisPos(node, [
        sceneOptions.longitude,
        sceneOptions.latitude,
        elevation,
      ]);
      obj.code.isEnableGis = true;
    } else {
      await player.Native.NodeProxy.setLocalTranslation(
        node,
        obj.localPosition
      );
    }
    await player.Native.NodeProxy.setLocalRotation(node, obj.localRotation);
    await player.Native.NodeProxy.setLocalScaling(node, obj.localScaling);
    // 设置节点属性
    await player.Native.NodeProxy.setNodeInfo(node, {
      name: obj.name,
      code: JSON.stringify(obj.code),
      id: obj.guid,
    });
    // 递归子，继续创建
    if (obj.children && obj.children.length) {
      for (let i = 0; i < obj.children.length; ++i) {
        await loadSceneFromJson(
          obj.children[i],
          node,
          player,
          sceneOptions,
          nodes
        );
      }
    }
  }
  return nodes;
};
// 检查文件是否存在
async function checkTextureFile(data) {
  if (data && data.code && data.code.modelFileId) {
    if (data.code.materialFileId && data.code.materialFileId !== "undefined") {
      const url = `data://../apps/${data.code.filePath.split("/")[4]}/models/${
        data.code.modelFileId
      }/${data.code.modelFileId}.zip`;
      const fileInfo = {
        id: data.code.materialFileId,
        url,
        fileType: "zip",
      };
      const apiConfig = {
        path: `${fileBasePath}/api/file-management/files/public/${data.code.materialFileId}/download`,
        method: "GET",
        headers: {
          Authorization: `Bearer `,
        },
      };
      const res = await downloadFile(
        player,
        fileInfo,
        apiConfig,
        progressMsg,
        downloadMaterialMsg(data)
      );
      if (res.type === 0 && res.success) {
        checkModelFile(data);
      } else {
        // this.showLoadProgress = true
        // this.loadType = '下载中...'
      }
    } else {
      checkModelFile(data);
    }
  }
}
// 通过指定节点去查下面的子节点 nodeType 指定节点的类型，obj 需要筛选的对象数据源，arr 接收筛选后的数据集合
const getNodesByNodeType = async (obj, arr = []) => {
  // let currentNodeType = obj.code && obj.code.type
  const currentNodeType = obj?.code?.type;
  if (EnumObjectTypes.includes(currentNodeType)) {
    const nowObj = cloneDeep(obj);
    delete nowObj.children;
    arr.push(nowObj);
  }
  // 递归子，继续创建
  if (obj.children && obj.children.length) {
    for (let i = 0; i < obj.children.length; ++i) {
      await getNodesByNodeType(obj.children[i], arr);
    }
  }
  return arr;
};
// 加载场景
async function loadScene(initPlayer, sceneInfo) {
  // myResolve = resolve;
  sceneFileCount = 0;
  player = initPlayer;
  seneBaseInfo = sceneInfo;
  sceneRootNode = await player.Native.NodeProxy.rootNode();
  if (sceneInfo.model && isJSONObj(sceneInfo.model)) {
    sceneData = JSON.parse(sceneInfo.model);
    sceneFileList = await getNodesByNodeType(sceneData, []);
    if (!isEmpty(sceneFileList)) {
      checkTextureFile(sceneFileList[0]);
    } else {
      await loadSceneFromJson(sceneData, sceneRootNode, player, sceneInfo, []);
      if (sceneData.cameraParams && isJSONObj(sceneData.cameraParams)) {
        const { eye, target, up } = JSON.parse(sceneData.cameraParams);
        await player.Native.Camera.moveTo(eye, target, up, 2);
      } else if (sceneInfo.isEnableGis) {
        await moveToLLH(sceneInfo.longitude, sceneInfo.latitude);
      }
      // $emit("loadModelEnd");
      // myResolve();
    }
  } else {
    const nodePtr = await player.Native.NodeProxy.createNode(
      sceneRootNode,
      sceneInfo.name
    );
    if (sceneInfo.isEnableGis && sceneInfo.longitude && sceneInfo.latitude) {
      const elevation = (
        await player.Native.GisPlatform.queryDEM([
          [sceneInfo.longitude, sceneInfo.latitude, 0],
        ])
      )[0];
      await player.Native.NodeProxy.setNodeGisPos(nodePtr, [
        sceneInfo.longitude,
        sceneInfo.latitude,
        elevation,
      ]);
    }
    await player.Native.NodeProxy.setNodeInfo(nodePtr, {
      code: JSON.stringify({
        type: "Root",
        fileType: "",
        filePath: "",
        scene: sceneInfo.id,
        isEnableGis: sceneInfo.isEnableGis,
      }),
    });
    // $emit("loadModelEnd");
    // myResolve();
  }
  console.log("场景加载成功");
}

module.exports = loadScene;
