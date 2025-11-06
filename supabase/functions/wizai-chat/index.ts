import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    // Detect intent based on keywords
    const msg = message.toLowerCase();
    let response = "";
    
    // App-related
    if (msg.includes("bug") || msg.includes("settings") || msg.includes("theme") || 
        msg.includes("upload") || msg.includes("premium") || msg.includes("wizchat") ||
        msg.includes("how do i") || msg.includes("feature")) {
      const appResponses = [
        "Trying to change your theme? Go to Settings → Appearance → Pick Light or Dark! 💡",
        "Stuck on uploads? Only Pro users can send images — tap 'Go Pro' to unlock! 📸",
        "Need help navigating? The menu button is in the top-left corner! 🧭",
        "Premium features unlock tons of cool stuff — check out the Premium page! ✨",
      ];
      response = appResponses[Math.floor(Math.random() * appResponses.length)];
    }
    // Business Ideas
    else if (msg.includes("business") || msg.includes("startup") || msg.includes("money") ||
             msg.includes("investor") || msg.includes("monetize") || msg.includes("idea")) {
      const businessResponses = [
        "Love this energy! 💼 What problem are you solving? I'll help you build a plan.",
        "Want to validate your idea fast? Tell me your target customer — I'll draft your MVP!",
        "First business tip: focus on one problem, solve it better than anyone else. What's yours?",
        "Thinking of raising funds? Start with a pitch deck — I can guide you through it! 🚀",
      ];
      response = businessResponses[Math.floor(Math.random() * businessResponses.length)];
    }
    // Social Life
    else if (msg.includes("lonely") || msg.includes("friend") || msg.includes("date") ||
             msg.includes("feel") || msg.includes("advice") || msg.includes("weekend") ||
             msg.includes("stressed")) {
      const socialResponses = [
        "Feeling low? Sometimes a walk + good music resets everything 🎧🌿 Wanna try?",
        "First date nerves? Say this: 'I'm really glad we're doing this.' Works every time 😉",
        "You're not alone — I've got your back 💪 What's on your mind?",
        "Weekend plans? Try something new — explore your city, try a new café! ☕",
      ];
      response = socialResponses[Math.floor(Math.random() * socialResponses.length)];
    }
    // Education
    else if (msg.includes("exam") || msg.includes("study") || msg.includes("management") ||
             msg.includes("notes") || msg.includes("test") || msg.includes("school") ||
             msg.includes("university")) {
      const educationResponses = [
        "Business management exam coming up? Focus on SWOT, PESTEL, and cash flow — I'll quiz you!",
        "Study hack: 25 mins study + 5 mins dance break = unstoppable 📚💃",
        "Exam stress? Break topics into chunks — one chapter a day keeps panic away! 📖",
        "Need notes? I can help summarize key concepts — just tell me the topic! ✍️",
      ];
      response = educationResponses[Math.floor(Math.random() * educationResponses.length)];
    }
    // Games
    else if (msg.includes("bored") || msg.includes("game") || msg.includes("play") ||
             msg.includes("quiz") || msg.includes("fun") || msg.includes("riddle")) {
      const gameResponses = [
        "Bored? Let's play Word Chain! I say 'Apple' — you reply with a word starting with 'E'! 🍎",
        "Quick quiz: What's the capital of Ghana? A) Accra B) Kumasi C) Tamale — guess! 🇬🇭",
        "Riddle time: I speak without a mouth and hear without ears. What am I? (Answer: An echo!)",
        "Let's play 20 questions! Think of something and I'll try to guess it! 🤔",
      ];
      response = gameResponses[Math.floor(Math.random() * gameResponses.length)];
    }
    // General/Fallback
    else {
      response = "Hey there! 👋 I'm WizAi — here for app help, biz ideas, study tips, game time… or just to chat! What's on your mind?";
    }

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("WizAi chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
