const fs = require("fs");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

// Navigate to your contributes.configuration
const loggingSetting =
  pkg.contributes?.configuration?.properties?.["codevalidator.enableLogging"];


// Fail if default logging is true
if (loggingSetting?.default === true) {
  console.error(
    "\x1b[31m%s\x1b[0m",
    "❌ Packaging aborted: 'codevalidator.enableLogging' is set to true. " +
      "Disable it in package.json before packaging."
  );
  process.exit(1);
}

console.log("✅ Logging disabled. Safe to package.");