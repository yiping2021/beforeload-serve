const { forIn, find, toNumber, reduce } = require("lodash");
/**
 * @description: 设置用户偏好设置
 * @param {*} null
 * @return {*}
 */
async function setPreferenceSettings(userPreferenceSettings, player) {
  if (userPreferenceSettings.Show) {
    const showSettings = await player.Native.Settings.getAll();
    forIn(userPreferenceSettings.Show, (value, key) => {
      const settingInfo = find(showSettings, ["name", key]);
      if (settingInfo) {
        let currentValue = "";
        if (settingInfo.type === "bool") {
          currentValue = value === "true" || value === true;
        } else if (
          settingInfo.type === "int" ||
          settingInfo.type === "float" ||
          settingInfo.type === "double"
        ) {
          currentValue = toNumber(value);
        } else {
          currentValue = value;
        }
        player.Native.Settings.set(key, settingInfo.type, currentValue);
      }
    });
  }
  const roamingSettings = userPreferenceSettings.RoamTrance;
  if (roamingSettings) {
    forIn(roamingSettings, (value, key) => {
      let settingKeys = [];
      settingKeys = reduce(
        JSON.parse(value),
        (arr, item) => {
          arr.push(item.split("+"));
          return arr;
        },
        []
      );
      player.Native.Walking.setHotkey(key, settingKeys);
    });
    const RoamingSpeed = roamingSettings?.RoamingSpeed || 1;
    player.Native.Walking.setAvatarMoveSpeed(RoamingSpeed);
  }

  const figureSettings = userPreferenceSettings.People;
  if (figureSettings) {
    const isExists = await player.Native.File.exists(
      `data://../apps/${currentEnv.VUE_APP_CURRENT_PROJECT}/skin`
    );
    if (isExists) {
      player.Native.Walking.setAvatarBodySkin(
        `data://../apps/${currentEnv.VUE_APP_CURRENT_PROJECT}/skin/${figureSettings.avatarBodySkin}`
      );
      player.Native.Walking.setAvatarCapSkin(
        `data://../apps/${currentEnv.VUE_APP_CURRENT_PROJECT}/skin/${figureSettings.avatarCapSkin}`
      );
    }
  }
}

module.exports = setPreferenceSettings;
