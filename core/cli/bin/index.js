const importLocal = require("import-local");

if (importLocal(__filename)) {
  console.log("本地");
} else {
  console.log("全局");
}
