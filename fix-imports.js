import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(__dirname, "server");

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith(".ts")) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Regex to find relative imports: import ... from './foo' or import ... from '../bar'
  // and export ... from './foo'
  const regex =
    /(import|export)\s+([\s\S]*?)\s+from\s+['"](\.\.?\/[^'"]+)['"]/g;

  content = content.replace(regex, (match, type, items, importPath) => {
    if (
      !importPath.endsWith(".js") &&
      !importPath.endsWith(".css") &&
      !importPath.endsWith(".json")
    ) {
      modified = true;
      return `${type} ${items} from '${importPath}.js'`;
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  }
}

processDirectory(serverDir);
console.log("Done!");
