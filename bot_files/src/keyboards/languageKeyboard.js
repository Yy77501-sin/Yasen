const { t } = require("../locales");

function getLanguageKeyboard() {
  return {
    inline_keyboard: [[
      { text: t("ar", "start_language_ar"), callback_data: "setlang_ar" },
      { text: t("en", "start_language_en"), callback_data: "setlang_en" },
    ]],
  };
}

module.exports = {
  getLanguageKeyboard,
};
