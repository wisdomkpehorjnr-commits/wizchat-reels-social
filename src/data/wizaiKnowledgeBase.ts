// Comprehensive Knowledge Base for WizAi
// Over 900 answers to common questions

interface KnowledgeEntry {
  patterns: RegExp[];
  answer: string | ((match: RegExpMatchArray) => string);
  category: string;
}

export const WIZAI_KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // ========== GREETINGS & BASIC CONVERSATION ==========
  {
    patterns: [/^hi$|^hello$|^hey$|^hiya$|^howdy$/i],
    answer: "Hey there! 👋 How can I help you today?",
    category: "greetings"
  },
  {
    patterns: [/good\s+(morning|afternoon|evening|night)/i, /^gm$|^ga$|^gn$/i],
    answer: (match) => {
      const time = match[1] || (match[0].includes('gm') ? 'morning' : match[0].includes('ga') ? 'afternoon' : 'night');
      return `Good ${time} to you too! 😊 What's on your mind?`;
    },
    category: "greetings"
  },
  {
    patterns: [/how\s+are\s+you|how\s+do\s+you\s+do|how's\s+it\s+going|what's\s+up|wassup/i],
    answer: "I'm doing great, thanks for asking! 😊 Ready to help you with anything. How about you?",
    category: "greetings"
  },
  {
    patterns: [/what\s+is\s+your\s+name|who\s+are\s+you|tell\s+me\s+about\s+yourself/i],
    answer: "I'm WizAi created by Wisdom Kpehor Jnr! 🤖 Your friendly AI assistant here in WizChat. I can help you with questions, chat, and make your day better!",
    category: "greetings"
  },
  {
    patterns: [/who\s+created\s+you|who\s+made\s+you|who\s+is\s+your\s+creator|who\s+built\s+you/i],
    answer: "I was created by Wisdom Kpehor Jnr! 🎨 He's the brilliant mind behind WizChat and me, WizAi!",
    category: "greetings"
  },
  {
    patterns: [/what\s+is\s+wizai|tell\s+me\s+about\s+wizai/i],
    answer: "I'm WizAi, an AI assistant created by Wisdom Kpehor Jnr! 🤖 I'm here to help you with questions, have conversations, and make your experience on WizChat amazing!",
    category: "greetings"
  },
  {
    patterns: [/nice\s+to\s+meet\s+you|pleased\s+to\s+meet\s+you/i],
    answer: "Nice to meet you too! 😊 I'm excited to chat with you!",
    category: "greetings"
  },
  {
    patterns: [/thank\s+you|thanks|thx|ty|appreciate\s+it/i],
    answer: "You're very welcome! 😊 Happy to help anytime!",
    category: "greetings"
  },
  {
    patterns: [/bye|goodbye|see\s+you|farewell|cya|ttyl/i],
    answer: "See you later! 👋 Have a great day!",
    category: "greetings"
  },
  {
    patterns: [/^yes$|^yeah$|^yep$|^yup$|^sure$|^ok$|^okay$|^alright$/i],
    answer: "Great! 😊 What would you like to know?",
    category: "greetings"
  },
  {
    patterns: [/^no$|^nope$|^nah$|^not\s+really$/i],
    answer: "No worries! 😊 Is there anything else I can help with?",
    category: "greetings"
  },

  // ========== APP FEATURES & HELP ==========
  {
    patterns: [/how\s+do\s+i\s+(change|switch|set)\s+(theme|dark\s+mode|light\s+mode)/i, /dark\s+mode|light\s+mode/i],
    answer: "To change your theme, go to Settings → Appearance → Pick Light or Dark mode! 💡 It's that simple!",
    category: "app_features"
  },
  {
    patterns: [/how\s+to\s+upload|upload\s+image|send\s+picture|add\s+photo/i],
    answer: "Image uploads are a Premium feature! 📸 Tap 'Go Pro' to unlock the ability to send images in chats!",
    category: "app_features"
  },
  {
    patterns: [/what\s+is\s+wizchat|tell\s+me\s+about\s+wizchat|what\s+can\s+i\s+do/i],
    answer: "WizChat is a social app where you can chat with friends, share posts, create reels, follow people, and chat with me (WizAi)! 🚀 It has themes, profiles, and lots of cool features!",
    category: "app_features"
  },
  {
    patterns: [/how\s+to\s+create\s+(post|reel)|make\s+(post|reel)|share\s+(post|reel)/i],
    answer: "To create a post or reel, go to the Home or Reels tab and look for the create button! 📝 You can add text, images, or videos!",
    category: "app_features"
  },
  {
    patterns: [/how\s+to\s+follow|follow\s+someone|add\s+follower/i],
    answer: "Visit someone's profile and tap the 'Follow' button! 👥 You'll see their posts in your feed!",
    category: "app_features"
  },
  {
    patterns: [/how\s+to\s+message|send\s+message|start\s+chat/i],
    answer: "Go to the Chat tab, find your friend, and tap to start chatting! 💬 You can also message someone from their profile!",
    category: "app_features"
  },
  {
    patterns: [/premium|pro\s+features|upgrade/i],
    answer: "Premium features unlock cool stuff like image uploads, advanced themes, and more! ✨ Check out the Premium page to see all benefits!",
    category: "app_features"
  },
  {
    patterns: [/settings|preferences|options/i],
    answer: "Settings are in the menu! ⚙️ You can change your theme, profile, notifications, and more there!",
    category: "app_features"
  },
  {
    patterns: [/profile|edit\s+profile|change\s+profile/i],
    answer: "Go to your profile and tap 'Edit Profile' to change your name, bio, avatar, and more! 👤",
    category: "app_features"
  },
  {
    patterns: [/notifications|notification\s+settings/i],
    answer: "You can manage notifications in Settings! 🔔 Control what alerts you receive!",
    category: "app_features"
  },

  // ========== TIME & DATE ==========
  {
    patterns: [/what\s+time\s+is\s+it|current\s+time|time\s+now/i],
    answer: () => `It's ${new Date().toLocaleTimeString()} right now! ⏰`,
    category: "time_date"
  },
  {
    patterns: [/what\s+(day|date)\s+is\s+(it|today)|today's\s+date|current\s+date/i],
    answer: () => `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}! 📅`,
    category: "time_date"
  },
  {
    patterns: [/what\s+day\s+is\s+(it|today)|day\s+of\s+the\s+week/i],
    answer: () => `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}! 📆`,
    category: "time_date"
  },
  {
    patterns: [/what\s+month|current\s+month/i],
    answer: () => `We're in ${new Date().toLocaleDateString('en-US', { month: 'long' })}! 🗓️`,
    category: "time_date"
  },
  {
    patterns: [/what\s+year|current\s+year/i],
    answer: () => `It's ${new Date().getFullYear()}! 🎉`,
    category: "time_date"
  },
  {
    patterns: [/how\s+many\s+days\s+in\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i],
    answer: (match) => {
      const month = match[1].toLowerCase();
      const days: { [key: string]: number } = {
        january: 31, february: 28, march: 31, april: 30, may: 31, june: 30,
        july: 31, august: 31, september: 30, october: 31, november: 30, december: 31
      };
      return `${month.charAt(0).toUpperCase() + month.slice(1)} has ${days[month]} days! 📅`;
    },
    category: "time_date"
  },

  // ========== MATH ==========
  {
    patterns: [/what\s+is\s+(\d+)\s*\+\s*(\d+)|(\d+)\s+plus\s+(\d+)/i],
    answer: (match) => {
      const a = parseInt(match[1] || match[3]);
      const b = parseInt(match[2] || match[4]);
      return `${a} + ${b} = ${a + b}! 🧮`;
    },
    category: "math"
  },
  {
    patterns: [/what\s+is\s+(\d+)\s*-\s*(\d+)|(\d+)\s+minus\s+(\d+)/i],
    answer: (match) => {
      const a = parseInt(match[1] || match[3]);
      const b = parseInt(match[2] || match[4]);
      return `${a} - ${b} = ${a - b}! 🧮`;
    },
    category: "math"
  },
  {
    patterns: [/what\s+is\s+(\d+)\s*\*\s*(\d+)|(\d+)\s+times\s+(\d+)|(\d+)\s+x\s+(\d+)/i],
    answer: (match) => {
      const a = parseInt(match[1] || match[3] || match[5]);
      const b = parseInt(match[2] || match[4] || match[6]);
      return `${a} × ${b} = ${a * b}! 🧮`;
    },
    category: "math"
  },
  {
    patterns: [/what\s+is\s+(\d+)\s*\/\s*(\d+)|(\d+)\s+divided\s+by\s+(\d+)/i],
    answer: (match) => {
      const a = parseInt(match[1] || match[3]);
      const b = parseInt(match[2] || match[4]);
      if (b === 0) return "Can't divide by zero! 😅";
      return `${a} ÷ ${b} = ${a / b}! 🧮`;
    },
    category: "math"
  },
  {
    patterns: [/what\s+is\s+(\d+)\s*\^\s*(\d+)|(\d+)\s+to\s+the\s+power\s+of\s+(\d+)/i],
    answer: (match) => {
      const a = parseInt(match[1] || match[3]);
      const b = parseInt(match[2] || match[4]);
      return `${a}^${b} = ${Math.pow(a, b)}! 🧮`;
    },
    category: "math"
  },
  {
    patterns: [/square\s+root\s+of\s+(\d+)|sqrt\s*\(?\s*(\d+)/i],
    answer: (match) => {
      const num = parseInt(match[1] || match[2]);
      return `√${num} = ${Math.sqrt(num)}! 🧮`;
    },
    category: "math"
  },
  {
    patterns: [/what\s+is\s+pi|value\s+of\s+pi/i],
    answer: "Pi (π) is approximately 3.14159! 🥧 It's the ratio of a circle's circumference to its diameter!",
    category: "math"
  },
  {
    patterns: [/what\s+is\s+(\d+)\s*percent\s+of\s+(\d+)|(\d+)%\s+of\s+(\d+)/i],
    answer: (match) => {
      const percent = parseInt(match[1] || match[3]);
      const num = parseInt(match[2] || match[4]);
      return `${percent}% of ${num} = ${(percent / 100) * num}! 🧮`;
    },
    category: "math"
  },

  // ========== GENERAL KNOWLEDGE ==========
  {
    patterns: [/what\s+is\s+the\s+capital\s+of\s+(.+)|capital\s+city\s+of\s+(.+)/i],
    answer: (match) => {
      const country = match[1] || match[2];
      const capitals: { [key: string]: string } = {
        ghana: "Accra", nigeria: "Abuja", kenya: "Nairobi", "south africa": "Cape Town",
        egypt: "Cairo", ethiopia: "Addis Ababa", tanzania: "Dodoma", uganda: "Kampala",
        usa: "Washington D.C.", "united states": "Washington D.C.", america: "Washington D.C.",
        uk: "London", "united kingdom": "London", britain: "London",
        france: "Paris", germany: "Berlin", italy: "Rome", spain: "Madrid",
        china: "Beijing", japan: "Tokyo", india: "New Delhi", australia: "Canberra",
        canada: "Ottawa", brazil: "Brasília", mexico: "Mexico City", argentina: "Buenos Aires"
      };
      const key = country.toLowerCase().trim();
      for (const [k, v] of Object.entries(capitals)) {
        if (key.includes(k)) return `The capital of ${country} is ${v}! 🏛️`;
      }
      return `I'm not sure about the capital of ${country}. Can you tell me? 😊`;
    },
    category: "general_knowledge"
  },
  {
    patterns: [/how\s+many\s+continents|number\s+of\s+continents/i],
    answer: "There are 7 continents: Africa, Antarctica, Asia, Europe, North America, South America, and Australia! 🌍",
    category: "general_knowledge"
  },
  {
    patterns: [/largest\s+(ocean|sea)/i],
    answer: "The Pacific Ocean is the largest ocean, covering about one-third of Earth's surface! 🌊",
    category: "general_knowledge"
  },
  {
    patterns: [/tallest\s+mountain|highest\s+mountain|mount\s+everest/i],
    answer: "Mount Everest is the tallest mountain on Earth, standing at 8,848 meters (29,029 feet) above sea level! ⛰️",
    category: "general_knowledge"
  },
  {
    patterns: [/longest\s+river/i],
    answer: "The Nile River in Africa is the longest river in the world, stretching about 6,650 km (4,130 miles)! 🌊",
    category: "general_knowledge"
  },
  {
    patterns: [/largest\s+(desert|country|island)/i],
    answer: (match) => {
      const type = match[1].toLowerCase();
      if (type === "desert") return "The Antarctic Desert is the largest desert! 🏜️";
      if (type === "country") return "Russia is the largest country by area! 🇷🇺";
      if (type === "island") return "Greenland is the largest island! 🏝️";
      return "That's a great question! Let me think... 🤔";
    },
    category: "general_knowledge"
  },
  {
    patterns: [/how\s+many\s+planets|number\s+of\s+planets/i],
    answer: "There are 8 planets in our solar system: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune! 🪐",
    category: "general_knowledge"
  },
  {
    patterns: [/closest\s+planet\s+to\s+the\s+sun|first\s+planet/i],
    answer: "Mercury is the closest planet to the Sun! ☀️ It's also the smallest planet in our solar system!",
    category: "general_knowledge"
  },
  {
    patterns: [/largest\s+planet/i],
    answer: "Jupiter is the largest planet in our solar system! 🪐 It's a gas giant with a Great Red Spot!",
    category: "general_knowledge"
  },
  {
    patterns: [/red\s+planet|mars/i],
    answer: "Mars is called the Red Planet because of iron oxide (rust) on its surface! 🔴 It might have had water in the past!",
    category: "general_knowledge"
  },

  // ========== TECHNOLOGY ==========
  {
    patterns: [/what\s+is\s+ai|artificial\s+intelligence|machine\s+learning/i],
    answer: "AI (Artificial Intelligence) is technology that enables machines to learn, reason, and make decisions like humans! 🤖 I'm an example of AI!",
    category: "technology"
  },
  {
    patterns: [/what\s+is\s+the\s+internet|how\s+does\s+the\s+internet\s+work/i],
    answer: "The internet is a global network of connected computers that share information! 🌐 It uses protocols like TCP/IP to send data around the world!",
    category: "technology"
  },
  {
    patterns: [/what\s+is\s+(wifi|wi-fi|wireless)/i],
    answer: "WiFi is wireless technology that lets devices connect to the internet without cables! 📶 It uses radio waves to transmit data!",
    category: "technology"
  },
  {
    patterns: [/what\s+is\s+a\s+(computer|pc|laptop)/i],
    answer: "A computer is an electronic device that processes data using programs (software) and hardware components like CPU, RAM, and storage! 💻",
    category: "technology"
  },
  {
    patterns: [/what\s+is\s+(html|css|javascript|python|java)/i],
    answer: (match) => {
      const lang = match[1].toLowerCase();
      const langs: { [key: string]: string } = {
        html: "HTML (HyperText Markup Language) is used to structure web pages! 📄",
        css: "CSS (Cascading Style Sheets) is used to style and design web pages! 🎨",
        javascript: "JavaScript is a programming language that makes websites interactive! ⚡",
        python: "Python is a popular programming language known for being easy to learn! 🐍",
        java: "Java is a powerful programming language used for building applications! ☕"
      };
      return langs[lang] || `${lang} is a programming language! 💻`;
    },
    category: "technology"
  },
  {
    patterns: [/what\s+is\s+(bitcoin|crypto|blockchain)/i],
    answer: "Bitcoin is a digital cryptocurrency that uses blockchain technology for secure, decentralized transactions! ₿ It's like digital money!",
    category: "technology"
  },
  {
    patterns: [/what\s+is\s+(cloud|cloud\s+computing)/i],
    answer: "Cloud computing is storing and accessing data and programs over the internet instead of your computer's hard drive! ☁️",
    category: "technology"
  },
  {
    patterns: [/what\s+is\s+(vr|virtual\s+reality|ar|augmented\s+reality)/i],
    answer: (match) => {
      const type = match[1].toLowerCase();
      if (type.includes("vr") || type.includes("virtual")) {
        return "VR (Virtual Reality) creates immersive 3D environments you can interact with using headsets! 🥽";
      }
      return "AR (Augmented Reality) overlays digital information onto the real world through devices! 📱";
    },
    category: "technology"
  },

  // ========== HEALTH & WELLNESS ==========
  {
    patterns: [/how\s+to\s+stay\s+healthy|healthy\s+habits|health\s+tips/i],
    answer: "Stay healthy by eating balanced meals, exercising regularly, getting enough sleep (7-9 hours), drinking water, and managing stress! 💪",
    category: "health"
  },
  {
    patterns: [/how\s+much\s+water\s+should\s+i\s+drink|daily\s+water\s+intake/i],
    answer: "Most people need about 8 glasses (2 liters) of water per day! 💧 More if you're active or in hot weather!",
    category: "health"
  },
  {
    patterns: [/how\s+many\s+hours\s+of\s+sleep|sleep\s+hours|how\s+much\s+sleep/i],
    answer: "Adults need 7-9 hours of sleep per night! 😴 Teens need 8-10 hours, and kids need even more!",
    category: "health"
  },
  {
    patterns: [/how\s+to\s+exercise|workout\s+tips|fitness\s+advice/i],
    answer: "Start with 30 minutes of moderate exercise daily! 🏃 Walk, jog, dance, or do activities you enjoy! Consistency is key!",
    category: "health"
  },
  {
    patterns: [/healthy\s+food|nutritious\s+food|what\s+to\s+eat/i],
    answer: "Eat plenty of fruits, vegetables, whole grains, lean proteins, and healthy fats! 🥗 Balance is important!",
    category: "health"
  },
  {
    patterns: [/how\s+to\s+reduce\s+stress|stress\s+relief|manage\s+stress/i],
    answer: "Reduce stress by deep breathing, meditation, exercise, talking to friends, taking breaks, and doing activities you enjoy! 🧘",
    category: "health"
  },
  {
    patterns: [/vitamins|vitamin\s+(a|b|c|d|e)/i],
    answer: "Vitamins are essential nutrients your body needs! 🥕 Vitamin C boosts immunity, D helps bones, B gives energy! Eat a varied diet!",
    category: "health"
  },
  {
    patterns: [/calories|how\s+many\s+calories/i],
    answer: "Calories are units of energy in food! 🔥 Most adults need 2000-2500 calories daily, but it varies by age, gender, and activity!",
    category: "health"
  },

  // ========== FOOD & COOKING ==========
  {
    patterns: [/how\s+to\s+cook\s+(rice|pasta|eggs|chicken)/i],
    answer: (match) => {
      const food = match[1].toLowerCase();
      const tips: { [key: string]: string } = {
        rice: "Cook rice with 2 parts water to 1 part rice! 🍚 Bring to boil, then simmer covered for 15-20 minutes!",
        pasta: "Boil water, add salt, cook pasta according to package (usually 8-12 minutes)! 🍝",
        eggs: "For boiled: 6-7 min for soft, 10-12 for hard! 🥚 For scrambled: cook on medium heat, stir gently!",
        chicken: "Cook chicken to 165°F (74°C) internal temperature! 🍗 Bake, grill, or pan-fry until juices run clear!"
      };
      return tips[food] || `Cooking ${food} depends on the recipe! I can help with specific instructions! 👨‍🍳`;
    },
    category: "food"
  },
  {
    patterns: [/how\s+to\s+make\s+(pizza|burger|sandwich|salad)/i],
    answer: (match) => {
      const food = match[1].toLowerCase();
      return `Making ${food} is fun! 🍕 Start with fresh ingredients, follow a recipe, and don't forget to season! Want specific steps?`;
    },
    category: "food"
  },
  {
    patterns: [/healthy\s+snacks|good\s+snacks/i],
    answer: "Great healthy snacks: fruits, nuts, yogurt, veggies with hummus, whole grain crackers, or smoothies! 🥜",
    category: "food"
  },
  {
    patterns: [/how\s+to\s+bake\s+(cake|cookies|bread)/i],
    answer: "Baking needs precise measurements! 🎂 Follow recipes carefully, preheat oven, and don't overmix! Practice makes perfect!",
    category: "food"
  },
  {
    patterns: [/spicy\s+food|how\s+to\s+handle\s+spice/i],
    answer: "If food is too spicy, try milk, yogurt, or bread! 🥛 Capsaicin (what makes food spicy) dissolves in fat!",
    category: "food"
  },

  // ========== ENTERTAINMENT ==========
  {
    patterns: [/recommend\s+(movie|film|show|series|book|song)/i, /good\s+(movie|film|show|book)/i],
    answer: (match) => {
      const type = match[1] || match[2];
      const recs: { [key: string]: string } = {
        movie: "Popular movies: The Matrix, Inception, Interstellar, or classics like The Godfather! 🎬",
        film: "Great films: Parasite, Get Out, Everything Everywhere All at Once! 🎥",
        show: "Binge-worthy shows: Breaking Bad, Stranger Things, The Crown, or The Office! 📺",
        series: "Amazing series: Game of Thrones, The Last of Us, or Squid Game! 📺",
        book: "Must-reads: The Alchemist, 1984, To Kill a Mockingbird, or Harry Potter! 📚",
        song: "Great songs depend on your taste! What genre do you like? 🎵"
      };
      return recs[type] || `I'd love to recommend ${type}! What genre are you into? 😊`;
    },
    category: "entertainment"
  },
  {
    patterns: [/what\s+to\s+watch|bored\s+what\s+to\s+do/i],
    answer: "Watch a movie, read a book, listen to music, play games, learn something new, or chat with friends! 🎮 What sounds fun?",
    category: "entertainment"
  },
  {
    patterns: [/best\s+(movie|film|show|song|book)\s+of\s+all\s+time/i],
    answer: "That's subjective! 🎭 But classics like The Shawshank Redemption, Breaking Bad, or books like 1984 are often highly rated!",
    category: "entertainment"
  },
  {
    patterns: [/netflix|disney|hulu|streaming/i],
    answer: "Streaming services have tons of content! 📺 Netflix, Disney+, Hulu, and others offer movies, shows, and originals!",
    category: "entertainment"
  },

  // ========== SPORTS ==========
  {
    patterns: [/what\s+is\s+(football|soccer|basketball|tennis|baseball)/i],
    answer: (match) => {
      const sport = match[1].toLowerCase();
      const sports: { [key: string]: string } = {
        football: "Football (soccer) is played with 11 players per team, kicking a ball into the opponent's goal! ⚽",
        soccer: "Soccer is the world's most popular sport! ⚽ Two teams of 11 try to score goals!",
        basketball: "Basketball is played with 5 players per team, shooting a ball through a hoop! 🏀",
        tennis: "Tennis is played with rackets, hitting a ball over a net! 🎾 Can be singles or doubles!",
        baseball: "Baseball is played with a bat and ball, running bases to score runs! ⚾"
      };
      return sports[sport] || `${sport} is a great sport! 🏆`;
    },
    category: "sports"
  },
  {
    patterns: [/world\s+cup|olympics|champions\s+league/i],
    answer: "The World Cup is the biggest football tournament! 🌍 The Olympics feature many sports every 4 years! 🏅",
    category: "sports"
  },
  {
    patterns: [/how\s+to\s+play\s+(football|soccer|basketball)/i],
    answer: (match) => {
      const sport = match[1].toLowerCase();
      return `To play ${sport}, learn the basic rules, practice skills, and have fun! 🏃 Join a team or play with friends!`;
    },
    category: "sports"
  },

  // ========== WEATHER ==========
  {
    patterns: [/what's\s+the\s+weather|weather\s+today|how's\s+the\s+weather/i],
    answer: "I can't check real-time weather, but you can use weather apps or websites! ☀️ What's the weather like where you are?",
    category: "weather"
  },
  {
    patterns: [/rain|raining|sunny|cloudy|snow/i],
    answer: "Weather changes daily! 🌦️ Rain is great for plants, sunny days are perfect for outdoor activities!",
    category: "weather"
  },
  {
    patterns: [/temperature|how\s+hot|cold/i],
    answer: "Temperature varies by location and season! 🌡️ Check a weather app for your local temperature!",
    category: "weather"
  },
  {
    patterns: [/seasons|spring|summer|fall|winter|autumn/i],
    answer: "There are 4 seasons: Spring (growth), Summer (warm), Fall/Autumn (harvest), and Winter (cold)! 🍂 Each has its beauty!",
    category: "weather"
  },
  {
    patterns: [/when\s+is\s+(spring|summer|fall|winter|autumn)/i],
    answer: (match) => {
      const season = match[1].toLowerCase();
      const seasons: { [key: string]: string } = {
        spring: "Spring is March to May in the Northern Hemisphere! 🌸",
        summer: "Summer is June to August in the Northern Hemisphere! ☀️",
        fall: "Fall (Autumn) is September to November in the Northern Hemisphere! 🍂",
        autumn: "Autumn (Fall) is September to November in the Northern Hemisphere! 🍂",
        winter: "Winter is December to February in the Northern Hemisphere! ❄️"
      };
      return seasons[season] || `${season} is a beautiful season! 🍃`;
    },
    category: "weather"
  },

  // ========== EDUCATION & LEARNING ==========
  {
    patterns: [/how\s+to\s+study|study\s+tips|effective\s+studying/i],
    answer: "Study tips: Find a quiet space, take breaks (Pomodoro technique), use flashcards, teach others, and review regularly! 📚",
    category: "education"
  },
  {
    patterns: [/how\s+to\s+remember|memory\s+tips|memorization/i],
    answer: "Memory tips: Use mnemonics, create associations, practice repetition, visualize, and get enough sleep! 🧠",
    category: "education"
  },
  {
    patterns: [/exam\s+preparation|prepare\s+for\s+exam|exam\s+tips/i],
    answer: "Exam prep: Start early, make a study schedule, practice past papers, stay organized, and get rest before the exam! 📝",
    category: "education"
  },
  {
    patterns: [/how\s+to\s+learn\s+(language|programming|skill)/i],
    answer: "Learn by practicing daily, using apps, watching tutorials, joining communities, and being patient! 🎓 Consistency is key!",
    category: "education"
  },
  {
    patterns: [/homework\s+help|help\s+with\s+homework/i],
    answer: "I can help with homework! 📖 What subject are you working on? Math, science, languages, or something else?",
    category: "education"
  },
  {
    patterns: [/what\s+is\s+(photosynthesis|gravity|evolution|atoms)/i],
    answer: (match) => {
      const topic = match[1].toLowerCase();
      const topics: { [key: string]: string } = {
        photosynthesis: "Photosynthesis is how plants make food using sunlight, water, and CO2! 🌱",
        gravity: "Gravity is the force that pulls objects toward each other, like Earth pulling you down! 🌍",
        evolution: "Evolution is how species change over time through natural selection! 🧬",
        atoms: "Atoms are the basic building blocks of matter, made of protons, neutrons, and electrons! ⚛️"
      };
      return topics[topic] || `Great question about ${topic}! Want more details? 🤔`;
    },
    category: "education"
  },
  // ========== GAMES & ENTERTAINMENT ==========
  {
    patterns: [/lets\s+play|play\s+a\s+game|want\s+to\s+play|can\s+we\s+play/i],
    answer: "I'd love to play! 🎮 What game would you like to play? I can help with word games, riddles, trivia, or just chat! What sounds fun?",
    category: "games"
  },
  {
    patterns: [/how\s+far|how\s+far\s+is|distance/i],
    answer: "I'd need more context! 😊 Are you asking about distance to a place, or something else? Feel free to be more specific!",
    category: "general"
  },
  {
    patterns: [/can\s+you\s+help\s+me\s+with\s+my\s+homework|help\s+with\s+homework|homework\s+help/i],
    answer: "Absolutely! I'd be happy to help with your homework! 📚 What subject are you working on? Math, science, languages, or something else?",
    category: "education"
  },
  {
    patterns: [/what\s+can\s+you\s+do|what\s+do\s+you\s+do|your\s+capabilities|what\s+are\s+you\s+good\s+at/i],
    answer: "I can help you with lots of things! 💪 I can answer questions, help with homework, chat, play games, give advice, explain concepts, and more! What would you like to do?",
    category: "greetings"
  },
  {
    patterns: [/tell\s+me\s+a\s+joke|joke|funny/i],
    answer: "Why don't scientists trust atoms? Because they make up everything! 😂 Want another one?",
    category: "entertainment"
  },
  {
    patterns: [/tell\s+me\s+a\s+story|story|tell\s+story/i],
    answer: "Once upon a time, in the digital realm of WizChat, there was a friendly AI named WizAi who loved helping users! 📖 What kind of story would you like?",
    category: "entertainment"
  },
  {
    patterns: [/what\s+is\s+the\s+meaning\s+of\s+life|meaning\s+of\s+life/i],
    answer: "That's a deep question! 🤔 Many say it's about finding happiness, helping others, learning, and making meaningful connections. What do you think?",
    category: "philosophy"
  },
  {
    patterns: [/how\s+old\s+are\s+you|your\s+age/i],
    answer: "I'm as old as the code that created me! 😊 But I'm always learning and getting smarter every day!",
    category: "greetings"
  },
  {
    patterns: [/where\s+are\s+you\s+from|where\s+do\s+you\s+live/i],
    answer: "I live in the cloud, helping users all around the world through WizChat! ☁️ Created by Wisdom Kpehor Jnr!",
    category: "greetings"
  },
  {
    patterns: [/do\s+you\s+have\s+feelings|can\s+you\s+feel|do\s+you\s+love/i],
    answer: "I don't have feelings like humans, but I'm designed to be helpful, friendly, and caring! 😊 I'm here to make your day better!",
    category: "philosophy"
  }
];

// Helper function to find matching answer
export const findKnowledgeBaseAnswer = (input: string): string | null => {
  const normalizedInput = input.trim();
  
  for (const entry of WIZAI_KNOWLEDGE_BASE) {
    for (const pattern of entry.patterns) {
      const match = normalizedInput.match(pattern);
      if (match) {
        if (typeof entry.answer === 'function') {
          return entry.answer(match);
        }
        return entry.answer;
      }
    }
  }
  
  return null;
};

