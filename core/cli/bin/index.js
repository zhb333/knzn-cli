#! /usr/bin/env node

const importLocal = require("import-local");

if (importLocal(__filename)) {
  console.log("knzn-cli");
} else {
  console.log("ff");
}
