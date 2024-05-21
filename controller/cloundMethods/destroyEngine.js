/**
 * @description: 检查player是否有效
 * @param {IPlayer} player
 * @return {*}
 */
function checkPlayerLoad(player) {
  if (!player) {
    return false;
  }
  if (!player.Native) {
    return false;
  }
  return true;
}
function destroyEngine(player) {
  if (checkPlayerLoad(player)) {
    player.exit();
  }
  return true;
}

module.exports = destroyEngine;
