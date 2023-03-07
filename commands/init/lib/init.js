"use strict";

const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");
const fse = require("fs-extra");
const glob = require("glob");
const ejs = require("ejs");
const pkgDir = require("pkg-dir").sync;
const semver = require("semver");
const userHome = require("user-home");
var validatePackageName = require("validate-npm-package-name");
const Command = require("@knzn/command");
const Package = require("@knzn/package");
const log = require("@knzn/log");
const { spinnerStart, execAsync } = require("@knzn/utils");

const getProjectTemplate = require("./getProjectTemplate");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";

const WHITE_COMMAND = ["npm", "cnpm"];
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = !!this._cmd.force;
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }

  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    // 文件过滤的逻辑
    fileList = fileList.filter(
      (file) => !file.startsWith(".") && ["node_modules"].indexOf(file) < 0
    );
    return !fileList || fileList.length <= 0;
  }
  createTemplateChoice() {
    return this.template.map((item) => ({
      value: item.npmName,
      name: item.name,
    }));
  }

  async getProjectInfo() {
    let projectInfo = {};
    let isProjectNameValid = false;

    if (!isProjectNameValid && this.projectName) {
      const validateProjectRes = validatePackageName(this.projectName);
      projectInfo.projectName = this.projectName;
      isProjectNameValid = validateProjectRes.validForNewPackages;
    }
    // 1. 选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型",
      default: TYPE_PROJECT,
      choices: [
        {
          name: "项目",
          value: TYPE_PROJECT,
        },
        {
          name: "组件",
          value: TYPE_COMPONENT,
        },
      ],
    });
    log.verbose("type", type);
    this.template = this.template.filter((template) =>
      template.tag.includes(type)
    );
    const title = type === TYPE_PROJECT ? "项目" : "组件";
    const projectNamePrompt = {
      type: "input",
      name: "projectName",
      message: `请输入${title}名称`,
      default: "",
      validate: function (v) {
        const done = this.async();
        const validateProjectRes = validatePackageName(v);
        if (!validateProjectRes.validForNewPackages) {
          done(`请输入合法的${title}名称`);
          return;
        }
        done(null, true);
      },
      filter: function (v) {
        return v;
      },
    };
    const projectPrompt = [];
    if (!isProjectNameValid) {
      projectPrompt.push(projectNamePrompt);
    }
    projectPrompt.push(
      {
        type: "input",
        name: "componentDescription",
        message: `请输入${title}描述信息`,
        default: `knzn-cli ${title}`,
        // validate: function (v) {
        //   const done = this.async();
        //   if (!v) {
        //     done(`请输入${title}描述信息`);
        //     return;
        //   }
        //   done(null, true);
        // },
      },
      {
        type: "input",
        name: "projectVersion",
        message: `请输入${title}版本号`,
        default: "1.0.0",
        validate: function (v) {
          const done = this.async();
          if (!semver.valid(v)) {
            done("请输入合法的版本号");
            return;
          }
          done(null, true);
        },
      }
    );
    if (!process.env.CLI_TEMPLATE_PATH) {
      projectPrompt.push({
        type: "list",
        name: "projectTemplate",
        message: `请选择${title}模板`,
        choices: this.createTemplateChoice(),
      });
    } else {
      if (!fse.pathExistsSync(process.env.CLI_TEMPLATE_PATH)) {
        throw new Error("本地模板路径不存在！");
      }
    }
    // 2. 获取项目的基本信息
    const project = await inquirer.prompt(projectPrompt);
    projectInfo = {
      ...projectInfo,
      type,
      ...project,
    };
    // 生成classname
    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName;
      projectInfo.className = projectInfo.projectName;
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription;
    }
    projectInfo.description = project.componentDescription;
    return projectInfo;
  }

  async prepare() {
    // 0. 判断项目模板是否存在
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error("项目目标不存在");
    }
    this.template = template;
    // 1. 判断当前目录是否为空
    const localPath = process.cwd();
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      if (!this.force) {
        // 询问是否继续创建
        ifContinue = (
          await inquirer.prompt({
            type: "confirm",
            name: "ifContinue",
            default: false,
            message: "当前文件夹不为空，是否继续创建项目",
          })
        ).ifContinue;
        if (!ifContinue) {
          return;
        }
      }
      // 2. 是否启动强制更新
      if (ifContinue || this.force) {
        // 给用户做二次确认
        const { confirmDelete } = await inquirer.prompt({
          type: "confirm",
          name: "confirmDelete",
          default: false,
          message: "是否确认清空当前目录下的文件？",
        });
        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localPath);
        }
      }
    }
    return this.getProjectInfo();
  }
  async downloadTemplate() {
    const { projectTemplate } = this.projectInfo;
    let templateInfo = {};
    if (process.env.CLI_TEMPLATE_PATH) {
      const templatePath = pkgDir(process.env.CLI_TEMPLATE_PATH);
      const templatePkgPath = path.join(templatePath, "package.json");
      if (fse.pathExistsSync(templatePkgPath)) {
        const templatePkg = require(templatePkgPath);
        const { name: npmName, version } = templatePkg;
        templateInfo = Object.assign(templateInfo, {
          npmName,
          version,
          ignore: ["**/public/**"],
        });
      } else {
        throw new Error("本地模板路径下不存在 package.json !");
      }
    } else {
      templateInfo = this.template.find(
        (item) => item.npmName === projectTemplate
      );
    }
    this.templateInfo = templateInfo;
    const templatePath = process.env.CLI_TEMPLATE_PATH;
    let templateNpm = null;
    const { npmName, version } = templateInfo;
    if (!templatePath) {
      const targetPath = path.resolve(userHome, ".knzn-cli", "template");
      const storeDir = path.resolve(targetPath, "node_modules");
      templateNpm = new Package({
        targetPath,
        storeDir,
        packageName: npmName,
        packageVersion: version,
      });
      if (!(await templateNpm.exists(version))) {
        const spinner = spinnerStart("正在下载模板...");
        try {
          await templateNpm.install();
        } catch (e) {
          throw e;
        } finally {
          spinner.stop(true);
          if (await templateNpm.exists(version)) {
            log.success("下载模板成功");
          }
        }
      }
    } else {
      templateNpm = new Package({
        targetPath: templatePath,
        packageName: npmName,
        packageVersion: version,
      });
    }
    this.templateNpm = templateNpm;
  }

  async ejsRender(options) {
    const dir = process.cwd();
    const projectInfo = this.projectInfo;
    const files = await glob("**", {
      cwd: dir,
      ignore: options.ignore || "",
      nodir: true,
    });

    return Promise.all(
      files.map((file) => {
        const filePath = path.join(dir, file);
        return new Promise((resolve, reject) => {
          ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
            if (err) {
              reject(err);
            } else {
              fse.writeFileSync(filePath, result);
              resolve(result);
            }
          });
        });
      })
    );
  }

  async installNormalTemplate() {
    log.verbose("templateNpm", this.templateNpm);
    // 拷贝模板代码至当前目录
    let spinner = spinnerStart("正在安装模板...");
    try {
      const templatePath = path.resolve(
        this.templateNpm.cacheFilePath,
        "template"
      );
      const targetPath = process.cwd();
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
    } catch (e) {
      throw e;
    } finally {
      spinner.stop(true);
      log.success("模板安装成功");
    }
    const templateIgnore = this.templateInfo.ignore || [];
    const ignore = ["**/node_modules/**", ...templateIgnore];
    await this.ejsRender({ ignore });
  }

  async installCustomTemplate() {
    // 查询自定义模板的入口文件
    // if (await this.templateNpm.exists(version)) {
    const rootFile = this.templateNpm.getRootFilePath();

    if (fs.existsSync(rootFile)) {
      log.notice("开始执行自定义模板");
      const templatePath = process.env.CLI_TEMPLATE_PATH;
      const options = {
        templateInfo: this.templateInfo,
        projectInfo: this.projectInfo,
        sourcePath: templatePath,
        targetPath: process.cwd(),
      };
      const code = `require('${rootFile}')(${JSON.stringify(options)})`;
      log.verbose("code", code);
      await execAsync("node", ["-e", code], {
        stdio: "inherit",
        cwd: process.cwd(),
      });
      log.success("自定义模板安装成功");
    } else {
      throw new Error("自定义模板入口文件不存在！");
    }
    // }
  }

  async installTemplate() {
    log.verbose("templateInfo", this.templateInfo);
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (!process.env.CLI_TEMPLATE_PATH) {
        // 标准安装
        await this.installNormalTemplate();
      } else {
        // 自定义安装
        await this.installCustomTemplate();
      }
    } else {
      throw new Error("项目模板信息不存在！");
    }
  }

  async exec() {
    try {
      // 1. 准备阶段
      const projectInfo = await this.prepare();
      if (projectInfo) {
        // 2. 下载模板
        log.verbose("projectInfo", projectInfo);
        this.projectInfo = projectInfo;
        await this.downloadTemplate();
        // 3. 安装模板
        await this.installTemplate();
      }
    } catch (e) {
      log.error(e.message);
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(e);
      }
    }
  }
}

function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
