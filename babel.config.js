module.exports = function (api) {
  api.cache(true);
  return {
    // zustand v5 ships `import.meta` in its ESM build; transform it so the web bundle loads.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
  };
};
