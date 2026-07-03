const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "lib", "api.ts");
let s = fs.readFileSync(filePath, "utf8");

const patterns = [
  /\s*const token = getAuthToken\(\);\s*if \(!token\) \{\s*return \{\s*success: false,\s*message: "Not authenticated",?\s*\};\s*\}\s*/g,
  /\s*const token = getAuthToken\(\);\s*if \(!token\) return \{ success: false, message: "Not authenticated" \};\s*/g,
  /\s*const authToken = getAuthToken\(\);\s*if \(!authToken\) \{\s*return \{\s*success: false,\s*message: "Not authenticated",?\s*\};\s*\}\s*/g,
  /\s*const token = getAuthToken\(\);\s*const headers: HeadersInit = \{\s*"Content-Type": "application\/json",?\s*\};\s*if \(token\) \{\s*headers\.Authorization = `Bearer \$\{token\}`;\s*\}\s*/g,
  /\s*const token = getAuthToken\(\);\s*const headers: HeadersInit = \{\s*"Content-Type": "application\/json",\s*\};\s*\s*\/\/ Include auth token if available[^\n]*\n\s*if \(token\) \{\s*headers\.Authorization = `Bearer \$\{token\}`;\s*\}\s*/g,
  /\s*headers: \{ Authorization: `Bearer \$\{token\}` \},\s*/g,
  /\s*Authorization: `Bearer \$\{token\}`,\s*/g,
  /\s*Authorization: `Bearer \$\{authToken\}`,\s*/g,
];

for (const pattern of patterns) {
  s = s.replace(pattern, "\n");
}

fs.writeFileSync(filePath, s);
console.log("api.ts patched");
