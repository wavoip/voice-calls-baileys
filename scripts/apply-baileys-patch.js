const fs = require("fs");
const path = require("path");

const EXPECTED_BAILEYS_VERSION = "7.0.0-rc13";
const RELATIVE_TARGET = path.join("lib", "Utils", "validate-connection.js");

function resolveBaileysDir() {
  const searchPaths = [process.cwd(), __dirname, path.join(__dirname, "..")];

  try {
    const pkg = require.resolve("baileys/package.json", { paths: searchPaths });
    return path.dirname(pkg);
  } catch {
    return null;
  }
}

function main() {
  const baileysDir = resolveBaileysDir();

  if (!baileysDir) {
    console.warn("[voice-calls-baileys] baileys not found, skipping patch. Voice calls require the patch to work.");
    return;
  }

  const installedVersion = require(path.join(baileysDir, "package.json")).version;
  if (installedVersion !== EXPECTED_BAILEYS_VERSION) {
    console.warn(
      `[voice-calls-baileys] baileys@${installedVersion} found, but the bundled patch targets ${EXPECTED_BAILEYS_VERSION}. ` +
        "Skipping patch to avoid breaking your install. Pin baileys to the expected version to enable voice calls."
    );
    return;
  }

  const source = path.join(__dirname, "..", "patches", "validate-connection.js");
  const target = path.join(baileysDir, RELATIVE_TARGET);

  fs.copyFileSync(source, target);
  console.log(`[voice-calls-baileys] Patched baileys@${installedVersion} (${RELATIVE_TARGET}).`);
}

try {
  main();
} catch (error) {
  console.warn("[voice-calls-baileys] Failed to apply baileys patch:", error && error.message);
}
