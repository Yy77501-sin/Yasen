const { t } = require("../locales");

function buildFeaturedRow(featuredCountry, providerKey, serviceCode, lang) {
  if (!featuredCountry) {
    return [];
  }

  return [[{
    text: `${t(lang, "grizzly_featured_best")} ${featuredCountry.text}`,
    callback_data: `buy_num_${providerKey}_${serviceCode}_${featuredCountry.id}_${featuredCountry.price}`,
  }]];
}

function buildCountryRows(countries, providerKey, serviceCode) {
  const rows = [];
  let currentRow = [];

  countries.forEach((country) => {
    currentRow.push({
      text: country.text,
      callback_data: `buy_num_${providerKey}_${serviceCode}_${country.id}_${country.price}`,
    });

    if (currentRow.length === 2) {
      rows.push(currentRow);
      currentRow = [];
    }
  });

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

function buildPaginationRow(page, totalPages, providerKey, serviceCode, lang) {
  const nav = [];
  if (page < totalPages - 1) {
    nav.push({ text: t(lang, "common_next"), callback_data: `grizzly:${providerKey}:app:${serviceCode}:page:${page + 1}` });
  }
  if (page > 0) {
    nav.push({ text: t(lang, "common_previous"), callback_data: `grizzly:${providerKey}:app:${serviceCode}:page:${page - 1}` });
  }
  return nav.length ? [nav] : [];
}

function getGrizzlyCountriesKeyboard(countries, providerKey, serviceCode, page, totalPages, lang, featuredCountry = null) {
  const rows = [
    ...buildFeaturedRow(featuredCountry, providerKey, serviceCode, lang),
    ...buildCountryRows(countries, providerKey, serviceCode),
    ...buildPaginationRow(page, totalPages, providerKey, serviceCode, lang),
    [{ text: t(lang, "common_back"), callback_data: "service:virtual_numbers" }],
  ];
  return { inline_keyboard: rows };
}

module.exports = {
  getGrizzlyCountriesKeyboard,
};
