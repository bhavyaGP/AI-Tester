const { execSync } = require("child_process");
const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");
async function generateTests() {
    const rawChanged = execSync("git diff --name-only HEAD~1 HEAD")
        .toString()
        .split("\n")
        .map(f => f.trim())
        .filter(Boolean);

    // Keep only JavaScript files inside the `server/` folder.
    // Normalize backslashes for Windows git output and allow nested server/ paths.
    const changedFiles = rawChanged
        .map(f => f.replace(/\\/g, '/'))
        .filter(f => f.endsWith('.js') && (f.startsWith('server/') || f.includes('/server/')));

    // Map of file -> changed code (diff hunks)
    const changedCodeMap = {};
    for (const file of changedFiles) {
        const diff = execSync(`git diff HEAD~1 HEAD -- ${file}`).toString();
        // Extract added/modified lines (lines starting with '+', but not '+++' from diff)
        const changedLines = diff
            .split('\n')
            .filter(line => line.startsWith('+') && !line.startsWith('+++'))
            .map(line => line.slice(1));
        changedCodeMap[file] = changedLines.join('\n');
    }

    if (changedFiles.length === 0) {
        console.log("⚠️ No JS files changed in the last commit.");
        return;
    }

    for (const file of changedFiles) {
        if (!fs.existsSync(file)) continue;
        const changedCode = changedCodeMap[file];
        if (!changedCode) continue;

        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API
        });

        const prompt = `
You are an AI that writes Jest tests.
Here is the changed code:
${changedCode}

Write a Jest test suite for this code with edge cases.

IMPORTANT INSTRUCTIONS:
- Use Jest testing framework
- Include describe blocks and individual test cases
- Add meaningful test descriptions
- Include both positive and negative test cases
- Test boundary conditions
- Return ONLY the unit test code, no additional description or markdown formatting
- Do not include \`\`\`javascript or any code block markers
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        const tests = response.text();
        const testFileName = `tests/${file.replace(".js", ".test.js")}`;
        if (!fs.existsSync("tests")) fs.mkdirSync("tests");

        fs.writeFileSync(testFileName, tests);
        console.log(`✅ Tests generated: ${testFileName}`);
    }
}

generateTests();
