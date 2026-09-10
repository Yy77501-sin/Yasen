function getVipTier(totalDeposits) {
  const value = Number(totalDeposits || 0);

  if (value >= 50000) {
    return "VIP MAX 💎";
  }

  if (value >= 10000) {
    return "VIP 3 🥇";
  }

  if (value >= 5000) {
    return "VIP 2 🥈";
  }

  if (value >= 1000) {
    return "VIP 1 🥉";
  }

  return "Standard";
}

module.exports = {
  getVipTier,
};
