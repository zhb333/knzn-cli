"use strict";

const fs = require("fs");

function isObject(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}

function exec(command, args, options) {
  const win32 = process.platform === "win32";
  const cmd = win32 ? "cmd" : command;
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;
  return require("child_process").spawn(cmd, cmdArgs, options || {});
}

function spinnerStart(msg = "loading...") {
  const Spinner = require("cli-spinner").Spinner;
  const cliSpinners = require("cli-spinners");
  const spinnerString = cliSpinners.random.frames.join("");
  const spinner = new Spinner(`%s ${msg}    `);
  spinner.setSpinnerString(spinnerString);
  spinner.start();
  return spinner;
}

function sleep(timeout = 1000) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

function execAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = exec(command, args, options);
    p.on("error", (e) => {
      reject(e);
    });

    p.on("exit", (c) => {
      resolve(c);
    });
  });
}

function readFile(path, options = {}) {
  if (fs.existsSync(path)) {
    const buffer = fs.readFileSync(path);
    if (buffer) {
      if (options.toJson) {
        return buffer.toJSON();
      } else {
        return buffer.toString();
      }
    }
  }
  return null;
}

function writeFile(path, data, { rewrite = true } = {}) {
  if (fs.existsSync(path)) {
    if (rewrite) {
      fs.writeFileSync(path, data);
      return true;
    }
    return false;
  } else {
    fs.writeFileSync(path, data);
    return true;
  }
}

module.exports = {
  isObject,
  exec,
  spinnerStart,
  sleep,
  execAsync,
  readFile,
  writeFile,
};
