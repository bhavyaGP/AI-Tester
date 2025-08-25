const { InferenceClient } = require("@huggingface/inference");

const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

async function getaicall() {
  const chatCompletion = await client.chatCompletion({
    provider: "fireworks-ai",
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "user",
        content: `
You are an expert JavaScript testing assistant.
Your job is to generate **complete and executable Jest unit tests** for the given code.
=== CODE START ===
function add(a,b){
return a+b;
}
=== CODE END ===
TEST REQUIREMENTS:
- Use the Jest testing framework
- Cover ALL functions, methods, and exported modules
- Do NOT include explanations, comments, or extra text
- Do NOT include markdown (no \`\`\`)
- Output ONLY pure Jest test code
- Organize tests with describe + it/test blocks
- Add meaningful test descriptions
- Include positive and negative cases
- Include edge cases
`
      },
    ],
  });

  console.log(chatCompletion.choices[0].message.content);
}

getaicall();
