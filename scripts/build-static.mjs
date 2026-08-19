import { cpSync, mkdirSync, rmSync } from "node:fs";

await import("./validate.mjs");

const output = "dist";
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const file of ["index.html", "qa-responsive.html", "styles.css"]) cpSync(file, `${output}/${file}`);
for (const directory of ["src", "assets"]) cpSync(directory, `${output}/${directory}`, { recursive: true });

console.log("Statik Preview çıktısı dist/ altında hazırlandı.");
