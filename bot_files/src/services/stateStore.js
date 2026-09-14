const { STATES_DB_PATH } = require("../config");
const { loadData, saveData } = require("./jsonStorage");

let userStates = loadData(STATES_DB_PATH, {});

function persist() {
  saveData(STATES_DB_PATH, userStates);
}

function setUserState(userId, stateName, data = {}) {
  const safeData = { ...data };
  // If data happened to have a "name" property (e.g. provider name, site name), store it safely
  if (safeData.name && safeData.name !== stateName) {
    safeData.entityName = safeData.name;
    safeData.providerName = safeData.name;
    safeData.inputName = safeData.name;
  }
  delete safeData.name;
  delete safeData.state;

  const entry = {
    ...safeData,
    state: stateName,
    name: stateName, // Guarantee state.name is strictly stateName
  };

  const idStr = String(userId);
  userStates[idStr] = entry;
  userStates[userId] = entry;
  persist();
}

function getUserState(userId) {
  const idStr = String(userId);
  return userStates[idStr] || userStates[userId] || null;
}

function clearUserState(userId) {
  const idStr = String(userId);
  delete userStates[idStr];
  delete userStates[userId];
  persist();
}

module.exports = {
  setUserState,
  getUserState,
  clearUserState,
};
