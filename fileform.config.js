const path = require("path");

exports.form = {
  description: String,
};

const basename = path.basename(__dirname);

const ident = basename.replace(/^vite-(plugin-)?/, "");

exports.context = {
  name: basename,
  ident,
};
