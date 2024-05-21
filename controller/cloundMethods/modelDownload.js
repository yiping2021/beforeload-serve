/**
 * 下载文件
 * @param {*} player player实例
 * @param {*} fileInfo 文件信息：{id:文件id,url:文件下载路径,fileType:文件类型}
 * @param {*} apiConfig 下载请求信息：{path:请求后端接口地址,method:请求方式,headers:接口请求头}
 * @returns 下载结果
 *          - type: 0为文件存在不需要下载，1为文件不存在需要下载
 *          - success: 下载成功或失败
 */
const downloadFile = async (
  player,
  fileInfo,
  apiConfig,
  progressMsg = () => {},
  downloadEndMsg = () => {}
) => {
  const isExists = await player.Native.File.exists(fileInfo.url);
  if (isExists) {
    return { type: 0, success: true };
  }
  // 模型中转文件
  const tempsUrl = `data://../temps/models/${fileInfo.id}/${fileInfo.id}.${fileInfo.fileType}`;
  // 处理下载进度方法
  const processFun = (file, bytesReceived, bytesTotal) => {
    progressMsg(file, bytesReceived, bytesTotal);
  };
  // 处理下载结束方法
  const downloadEndFun = async (file, err) => {
    // const tempsMd5 = await player.Native.File.getFileMd5(tempsUrl)
    // if (tempsMd5 === fileInfo.md5) {
    //   // 移动文件到指定文件夹
    await player.Native.File.move(tempsUrl, fileInfo.url);
    if (fileInfo.fileType === "zip") {
      await player.Native.UiQt.decompressingZIP(fileInfo.url, "");
    }
    // } else {
    //   app.$message.warning('当前请求的md5和服务器下载的md5不一致！')
    // }
    downloadEndMsg(file, err);
    player.Native.File.EventDownloadProcessChanged.disconnect(processFun);
    player.Native.File.EventDownloadFinish.disconnect(downloadEndFun);
  };
  // 监听下载进度
  player.Native.File.EventDownloadProcessChanged.connect(processFun);
  // 监听下载结束
  player.Native.File.EventDownloadFinish.connect(downloadEndFun);
  const res = await player.Native.File.downloadFile(
    tempsUrl,
    apiConfig.method,
    apiConfig.path,
    apiConfig.headers
  );
  return { type: 1, success: res };
};
module.exports = downloadFile;
