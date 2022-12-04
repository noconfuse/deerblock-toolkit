const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

// Generate pages object
const pagesObj = {};

const chromeName = ["popup", "options"];

chromeName.forEach((name) => {
  pagesObj[name] = {
    entry: `src/${name}/index.ts`,
    template: "public/index.html",
    filename: `${name}.html`,
  };
});

const plugins =
  process.env.NODE_ENV === "production"
    ? [
        {
          from: path.resolve("src/manifest.production.json"),
          to: `${path.resolve("dist")}/manifest.json`,
        },
      ]
    : [
        {
          from: path.resolve("src/manifest.development.json"),
          to: `${path.resolve("dist")}/manifest.json`,
        },
      ];

module.exports = {
  pages: pagesObj,
  productionSourceMap: false,
  configureWebpack: {
    plugins: [CopyWebpackPlugin(plugins)],
    entry: {
      "content-script": "./src/content/index.ts",
      inject: "./src/scripts/inject.ts",
      background: "./src/background/index.ts",
    },
    output: {
      filename: "js/[name].js",
    },
  },
};
