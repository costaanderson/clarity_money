// Patches nf3's ESM/CJS interop issue with @vercel/nft on Node.js 22+
// nf3 does `import { nodeFileTrace } from "@vercel/nft"` but @vercel/nft is CJS,
// so Node.js 22 can't resolve the named export. We fix by creating an ESM wrapper.
const fs = require("fs");
const path = require("path");

const nftDir = path.join(__dirname, "../node_modules/nf3/dist/node_modules/@vercel/nft");
if (!fs.existsSync(nftDir)) {
  console.log("[patch-nft] @vercel/nft not found at expected path, skipping.");
  process.exit(0);
}

// Create an ESM wrapper that re-exports named exports from the CJS module
const esmWrapper = path.join(nftDir, "out", "index.mjs");
const esmContent = `import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nft = require('./index.js');
export const nodeFileTrace = nft.nodeFileTrace;
export const Job = nft.Job;
export default nft;
`;

fs.writeFileSync(esmWrapper, esmContent);

// Patch package.json to add exports field pointing to the ESM wrapper
const pkgPath = path.join(nftDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.exports = {
  ".": {
    import: "./out/index.mjs",
    require: "./out/index.js",
    default: "./out/index.js",
  },
};
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

console.log("[patch-nft] Patched @vercel/nft for ESM compatibility.");
