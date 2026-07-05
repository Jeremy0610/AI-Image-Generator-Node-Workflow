<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/bbebf415-4c3c-4688-80d2-e00f51b0e501

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app with its local API function:
   `npm run dev`

If `npm` is not available in your PowerShell PATH while using Codex Desktop, run:

```powershell
& "C:\Users\89204\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" ".\node_modules\vite\bin\vite.js" --host 127.0.0.1 --port 3000
```

Enter your own Gemini API key in the app when needed. The key is kept only for the current browser tab and is sent through the server proxy only for Gemini requests. Do not configure a shared `GEMINI_API_KEY` build variable.

Keep Preview Deployment Protection enabled while testing private development branches.
