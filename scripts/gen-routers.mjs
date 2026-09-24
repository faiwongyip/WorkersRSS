import fs from "fs/promises";
import path from "path";
import {fileURLToPath} from "url";

// 扫描 src/routers 目录，自动生成静态导入的路由表。
// Cloudflare 无法打包 `import("./routers/" + mode + ".js")` 这类动态路径，
// 因此必须在这里生成静态 import。

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const routersDir = path.resolve(scriptDir, "../src/routers");
const outputFile = path.join(routersDir, "_registry.js");

const files = (await fs.readdir(routersDir))
    .filter(name => name.endsWith(".js") && name !== "_registry.js")
    .sort();

const names = files.map(name => path.basename(name, ".js"));

const lines = [
    "// 本文件由 scripts/gen-routers.mjs 自动生成，请勿手动修改。",
    "",
    ...names.map(name => `import {${name}} from "./${name}.js"`),
    "",
    "export const routers = {",
    ...names.map(name => `    ${name},`),
    "};",
    "",
];

await fs.writeFile(outputFile, lines.join("\n"), "utf8");

console.log(`已生成 _registry.js，共 ${names.length} 个路由: ${names.join(", ")}`);
