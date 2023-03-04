"use strict";

const fs = require("fs");
const path = require("path");
// const inquirer = require("inquirer");
const fse = require("fs-extra");

module.exports = init;

function init(args) {
  console.log(args, "fuck");
  return "Hello from init";
}
