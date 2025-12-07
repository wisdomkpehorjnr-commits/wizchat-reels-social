# WizChat AI Deployment Instructions

## Step 1: Set Supabase Function Secret

Run this command to set the DeepSeek API key in Supabase:

```bash
supabase secrets set DEEPSEEK_API_KEY=sk-2b8bac1be3484bb2a813d42900f50c3f
```

## Step 2: Deploy the Function

Deploy the wizchat-ai function:

```bash
supabase functions deploy wizchat-ai
```

## Step 3: Verify Deployment

Test the function:

```bash
supabase functions invoke wizchat-ai --body '{"prompt":"Hello"}'
```

## Environment Variables

The `.env` file has been created with:
- VITE_DEEPSEEK_API_KEY (already set)
- VITE_SUPABASE_URL (auto-detected)
- VITE_SUPABASE_ANON_KEY (auto-detected)

## How It Works

1. User sends message in WizAiChat
2. Frontend calls `askWizAI()` from `src/lib/wizchatAI.ts`
3. This invokes Supabase function `wizchat-ai`
4. Function calls DeepSeek API with the prompt
5. Response is returned to the chat UI

## Notes

- The function is already created at `supabase/functions/wizchat-ai/index.ts`
- The frontend integration is complete in `src/components/WizAiChat.tsx`
- No API routes needed (this is Vite, not Next.js)

