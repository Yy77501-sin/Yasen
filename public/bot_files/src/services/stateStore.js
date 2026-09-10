const { STATES_DB_PATH } = require("../config");
const { loadData, saveData } = require("./jsonStorage");

let userStates = loadData(STATES_DB_PATH, {});

function persist() {
  saveData(STATES_DB_PATH, userStates);
}

function setUserState(userId, stateName, data = {}) {
  userStates[userId] = {
    name: stateName,
    ...data,
  };
  persist();
}

function getUserState(userId) {
  return userStates[userId] || null;
}

function clearUserState(userId) {
  delete userStates[userId];
  persist();
}

module.exports = {
  setUserState,
  getUserState,
  clearUserState,
};
