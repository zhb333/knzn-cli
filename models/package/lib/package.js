"use strict";

const path = require("path");
const fse = require("fs-extra");
const pkgDir = require("pkg-dir").sync;
const pathExists = require("path-exists").sync;
const npminstall = require("npminstall");
const semver = require("semver");
const { isObject } = require("@knzn/utils");
const formatPath = require("@knzn/format-path");
const {
  getDefaultRegistry,
  getNpmLatestVersion,
} = require("@knzn/get-npm-info");

class Package {
  constructor(options) {
    if (!options) {
      throw new Error("Package类的options参数不能为空 !");
    }

    if (!isObject(options)) {
      throw new Error("Package类的options参数必须为对象！");
    }
    // package的目标路径
    this.targetPath = options.targetPath;
    // 缓存package的路径
    this.storeDir = options.storeDir;
    // package的name
    this.packageName = options.packageName;
    // package的version
    this.packageVersion = options.packageVersion;
  }

  async prepare() {
    if (this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir);
    }
    if (this.packageVersion === "latest") {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  get cacheFilePath() {
    return path.resolve(this.storeDir, this.packageName);
  }

  async _install(packageVersion) {
    if (this.exists(packageVersion)) return;
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(true),
      pkgs: [
        {
          name: this.packageName,
          version: packageVersion,
        },
      ],
    });
  }

  exists(version) {
    const dir = pkgDir(this.cacheFilePath);
    if (dir) {
      const pkg = require(path.resolve(dir, "package.json"));
      if (pkg.version === version) return true;
    }
    return false;
  }

  // 安装Package
  async install() {
    await this.prepare();
    // 1. 获取最新的npm模块版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    console.log("latestPackageVersion", latestPackageVersion);
    if (semver.gt(latestPackageVersion, this.packageVersion)) {
      await this._install(latestPackageVersion);
      this.packageVersion = latestPackageVersion;
    } else {
      await this._install(this.packageVersion);
    }
  }

  // 获取入口文件的路径
  getRootFilePath() {
    function _getRootFile(targetPath) {
      // 1. 获取package.json所在目录
      const dir = pkgDir(targetPath);
      if (dir) {
        // 2. 读取package.json
        const pkgFile = require(path.resolve(dir, "package.json"));
        // 3. 寻找main/lib
        if (pkgFile && pkgFile.main) {
          // 4. 路径的兼容(macOS/windows)
          return formatPath(path.resolve(dir, pkgFile.main));
        }
      }
      return null;
    }

    if (this.storeDir) {
      return _getRootFile(this.cacheFilePath);
    } else {
      return _getRootFile(this.targetPath);
    }
  }
}

module.exports = Package;
