module.exports = {
  presets: [["next/babel", { "transform-runtime": { helpers: false, regenerator: false } }]],
  overrides: [
    {
      test: /node_modules[\\/]ably[\\/]build[\\/]modular[\\/]index\.mjs$/,
      presets: [[
        require.resolve("next/dist/compiled/babel/preset-env"),
        { targets: { chrome: "40" }, modules: false },
      ]],
    },
  ],
};
