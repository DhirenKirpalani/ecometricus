<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1bZpO4Gg5WY8buzGcJ-DjvWoAqrFyaLN1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `VITE_DEEPSEEK_API_KEY` in [.env](.env) to your DeepSeek API key.
3. Run the app:
   `npm run dev`

## AI Integration (Mila V2)

This project now uses **DeepSeek-V3** via the OpenAI-compatible API.
- **Engine**: DeepSeek-V4 Flash (`deepseek-v4-flash`)
- **Knowledge Base**: Hardcoded GSTC 2026 / ESG Criteria.
- **Live Metrics**: Correlates Daily Migration Data from Dashboard Vitals (Profit, Sales, Waste, etc.).
