#! /usr/bin/env node

const importLocal = require("import-local");

if (importLocal(__filename)) {
  require("npmlog").info("cli", "正在使用 knzn-cli 本地版本 !");
} else {
  require("../lib/cli.js")();
}
