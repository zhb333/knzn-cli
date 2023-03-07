"use strict";

const semver = require("semver");
const colors = require("colors/safe");
const log = require("@knzn/log");

const LOWEST_NODE_VERSION = "12.0.0";

class Command {
  constructor(argv) {
    if (!argv) {
      throw new Error("参数不能为空！");
    }

    if (!Array.isArray(argv)) {
      throw new Error("参数必须为数组");
    }

    if (argv.length < 1) {
      throw new Error("参数列表为空！");
    }

    this._argv = argv;
    let chain = Promise.resolve();
    chain
      .then(() => this.checkNodeVersion())
      .then(() => this.initArgs())
      .then(() => this.init())
      .then(() => this.exec())
      .catch((err) => {
        log.error(err.message);
      });
  }

  initArgs() {
    this._cmd = this._argv[this._argv.length - 2];
    this._argv = this._argv.slice(0, this._argv.length - 1);
  }

  checkNodeVersion() {
    const currentVersion = process.version;
    const lowestVersion = LOWEST_NODE_VERSION;
    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(
        colors.red(`knzn-cli 需要安装 ${lowestVersion} 以上版本的 Node.js !`)
      );
    }
  }

  init() {
    throw new Error("init 必须实现！");
  }

  exec() {
    throw new Error("exec 必须实现！");
  }
}

module.exports = Command;
