module.exports = () => {
  return Promise.resolve([
    {
      tag: "project",
      npmName: "@imooc-cli/imooc-standard-template",
      name: "knzn standard template",
      version: "1.0.1",
      type: "normal",
      ignore: ["**/public/index.html"],
    },
    {
      tag: "component",
      npmName: "@imooc-cli/lego-components",
      name: "lego vue3 components",
      version: "1.0.5",
      type: "normal",
      ignore: ["**/*.png"],
    },
    {
      tag: "project",
      npmName: "@imooc-cli/imooc-lego-standard-template",
      name: "knzn-cli lego standard template",
      version: "1.0.0",
      type: "custom",
      ignore: ["**/public/index.html"],
    },
    {
      tag: "project",
      npmName: "@imooc-cli/react-standard-template",
      name: "knzn-cli react standard template",
      version: "1.0.1",
      type: "normal",
    },
    {
      tag: "project",
      npmName: "@imooc-cli/vue2-standard-template",
      name: "knzn-cli vue2 standard template",
      version: "1.0.2",
      type: "normal",
    },
    {
      tag: "component",
      npmName: "@imooc-cli/vue3-component",
      name: "knzn-cli vue3 component",
      version: "1.0.3",
      type: "normal",
    },
    {
      tag: "project",
      npmName: "@imooc-cli/vue3-standard-template",
      name: "knzn-cli vue3 standard template",
      version: "1.0.7",
      type: "normal",
    },
  ]);
};
