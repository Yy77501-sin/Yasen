const { getServicePrices, extractPrice } = require("./grizzlyService");
const { grizzlyServices, grizzlyCountries, getGrizzlyServiceCode, getGrizzlyCountryMeta } = require("../constants/grizzly");
const { getGrizzlyCountriesKeyboard } = require("../keyboards/grizzlyKeyboard");
const { sendOrEditMessage } = require("./profileService");
const { getUserLang, t, getArray } = require("../locales");

const PAGE_SIZE = 36;

function buildCountryButton(lang, id, apiPrice) {
  if (!grizzlyCountries[String(id)]) {
    return null;
  }

  const country = getGrizzlyCountryMeta(id);
  const name = lang === "ar"
    ? country.name_ar || t(lang, `grizzly_country_${id}`) || t(lang, "grizzly_country_other")
    : t(lang, `grizzly_country_${id}`) || country.name_ar || t(lang, "grizzly_country_other");
  const finalPriceRub = Math.ceil(parseFloat(apiPrice) * 25 * 1.20);

  if (!Number.isFinite(finalPriceRub) || finalPriceRub <= 0) {
    return null;
  }

  return {
    id: String(id),
    price: finalPriceRub,
    text: `₽${finalPriceRub} : ${country.flag} ${name} 🚀`,
  };
}

function getCountryList(lang, prices, serviceCode) {
  return Object.keys(prices || {})
    .map((id) => buildCountryButton(lang, id, extractPrice(prices, id, serviceCode)))
    .filter(Boolean)
    .sort((left, right) => left.price - right.price);
}

function findServiceLabel(lang, serviceKey) {
  const topApps = getArray(lang, "virtualNumbers_topApps");
  const otherPages = getArray(lang, "virtualNumbers_otherPages");
  const otherApps = Array.isArray(otherPages) ? otherPages.flat() : [];
  const allApps = [...topApps, ...otherApps];
  return allApps.find((label) => getGrizzlyServiceCode(label) === serviceKey) || serviceKey;
}

function resolveServiceCode(appLabelOrKey) {
  const normalized = String(appLabelOrKey || "").toLowerCase();
  if (Object.values(grizzlyServices).includes(normalized)) {
    return normalized;
  }
  return getGrizzlyServiceCode(appLabelOrKey);
}

async function sendGrizzlyCountriesMenu(bot, chatId, user, appLabelOrKey, page = 0, options = {}) {
  const lang = getUserLang(user);
  const providerKey = options.providerKey || "server2";
  const serviceCode = resolveServiceCode(appLabelOrKey);

  if (!serviceCode) {
    return sendOrEditMessage(
      bot,
      chatId,
      t(lang, "grizzly_price_error"),
      { inline_keyboard: [[{ text: t(lang, "common_back"), callback_data: "service:virtual_numbers" }]] },
      options.messageId,
      "sendGrizzlyCountriesMenu.unsupported"
    );
  }

  const prices = await getServicePrices(serviceCode, providerKey);
  if (!prices) {
    return sendOrEditMessage(
      bot,
      chatId,
      t(lang, "grizzly_price_error"),
      { inline_keyboard: [[{ text: t(lang, "common_back"), callback_data: "service:virtual_numbers" }]] },
      options.messageId,
      "sendGrizzlyCountriesMenu.noPrices"
    );
  }

  const list = getCountryList(lang, prices, serviceCode);
  const featuredCountry = list[0] || null;
  const pagedCountries = featuredCountry ? list.slice(1) : list;
  const totalPages = Math.max(1, Math.ceil(pagedCountries.length / PAGE_SIZE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const pageItems = pagedCountries.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const serviceLabel = findServiceLabel(lang, serviceCode);
  const text = [
    t(lang, "grizzly_header"),
    "",
    `${t(lang, "grizzly_service_label")}: ${serviceLabel}`,
    `${t(lang, "virtualNumbers_provider_label")} ${providerKey === "server1" ? "1" : "2"}`,
    t(lang, "virtualNumbers_first_row_note"),
    t(lang, "grizzly_select_country"),
    "",
    `${t(lang, "grizzly_page_label")}: ${safePage + 1}/${totalPages}`,
  ].join("\n");

  return sendOrEditMessage(
    bot,
    chatId,
    text,
    getGrizzlyCountriesKeyboard(pageItems, providerKey, serviceCode, safePage, totalPages, lang, featuredCountry),
    options.messageId,
    "sendGrizzlyCountriesMenu"
  );
}

async function sendGrizzlyCountryDetails(bot, chatId, user, serviceCode, countryId, options = {}) {
  const lang = getUserLang(user);
  const providerKey = options.providerKey || "server2";
  const prices = serviceCode ? await getServicePrices(serviceCode, providerKey) : null;
  const apiPrice = prices ? extractPrice(prices, countryId, serviceCode) : null;
  const finalPriceRub = apiPrice === null ? null : Math.ceil(parseFloat(apiPrice) * 25 * 1.20);

  const country = getGrizzlyCountryMeta(countryId);
  const countryName = lang === "ar"
    ? country.name_ar || t(lang, `grizzly_country_${countryId}`) || t(lang, "grizzly_country_other")
    : t(lang, `grizzly_country_${countryId}`) || country.name_ar || t(lang, "grizzly_country_other");
  const priceText = finalPriceRub === null ? t(lang, "grizzly_price_unavailable") : `${finalPriceRub} RUB`;
  const serviceLabel = findServiceLabel(lang, serviceCode);

  const body = t(lang, "grizzly_selected_body")
    .replace("{service}", serviceLabel)
    .replace("{country}", `${country.flag} ${countryName}`)
    .replace("{price}", priceText);

  const text = [`<b>${t(lang, "grizzly_selected_title")}</b>`, "", body].join("\n");
  return sendOrEditMessage(
    bot,
    chatId,
    text,
    { inline_keyboard: [[{ text: t(lang, "common_back"), callback_data: "service:virtual_numbers" }]] },
    options.messageId,
    "sendGrizzlyCountryDetails"
  );
}

module.exports = {
  sendGrizzlyCountriesMenu,
  sendGrizzlyCountryDetails,
};
