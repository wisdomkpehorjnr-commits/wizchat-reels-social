#!/bin/bash

# WizChat AI Deployment Script
# This script deploys the wizchat-ai Supabase function

echo "🚀 Deploying WizChat AI Function..."

# Set the DeepSeek API key as a Supabase secret
echo "📝 Setting DeepSeek API key..."
supabase secrets set DEEPSEEK_API_KEY=sk-2b8bac1be3484bb2a813d42900f50c3f

# Deploy the function
echo "📦 Deploying function..."
supabase functions deploy wizchat-ai

# Test the function
echo "✅ Testing function..."
supabase functions invoke wizchat-ai --body '{"prompt":"Hello, WizAI!"}'

echo "🎉 Deployment complete!"

