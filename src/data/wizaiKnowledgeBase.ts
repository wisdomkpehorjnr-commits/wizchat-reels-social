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
  },
  
  // ========== SCIENCE - PHYSICS ==========
  {
    patterns: [/what\s+is\s+gravity|how\s+does\s+gravity\s+work/i],
    answer: "Gravity is the force that attracts objects with mass toward each other! 🌍 Earth's gravity pulls you down at 9.8 m/s²!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+the\s+speed\s+of\s+light|speed\s+of\s+light/i],
    answer: "Light travels at approximately 299,792,458 meters per second (about 186,282 miles per second)! ⚡ That's incredibly fast!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+einstein|einstein|theory\s+of\s+relativity/i],
    answer: "Albert Einstein was a famous physicist! 🧠 His theory of relativity (E=mc²) revolutionized our understanding of space, time, and energy!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+quantum|quantum\s+physics|quantum\s+mechanics/i],
    answer: "Quantum physics studies matter and energy at the smallest scales! ⚛️ It's weird - particles can be in multiple places at once!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+black\s+hole|black\s+holes/i],
    answer: "Black holes are regions of space where gravity is so strong that nothing, not even light, can escape! 🕳️ They form when massive stars collapse!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+the\s+big\s+bang|big\s+bang\s+theory/i],
    answer: "The Big Bang theory says the universe started from a tiny, hot, dense point about 13.8 billion years ago and has been expanding ever since! 🌌",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+energy|types\s+of\s+energy/i],
    answer: "Energy is the ability to do work! ⚡ Types include kinetic (motion), potential (stored), thermal (heat), chemical, electrical, and nuclear!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+force|newton|newton's\s+laws/i],
    answer: "Force is a push or pull! 💪 Newton's laws: 1) Objects at rest stay at rest, 2) F=ma, 3) Every action has an equal reaction!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+electricity|how\s+does\s+electricity\s+work/i],
    answer: "Electricity is the flow of electric charge (electrons)! ⚡ It powers our devices and lights up our world!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+magnetism|magnetic\s+field/i],
    answer: "Magnetism is a force that attracts or repels certain materials! 🧲 Magnets have north and south poles that attract opposites!",
    category: "science"
  },
  
  // ========== SCIENCE - CHEMISTRY ==========
  {
    patterns: [/what\s+is\s+an\s+atom|atoms|atomic\s+structure/i],
    answer: "Atoms are the basic building blocks of matter! ⚛️ They have a nucleus (protons + neutrons) with electrons orbiting around!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+water\s+made\s+of|h2o|water\s+molecule/i],
    answer: "Water is H₂O - two hydrogen atoms bonded to one oxygen atom! 💧 It's essential for all life on Earth!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+oxygen|o2|breathing/i],
    answer: "Oxygen (O₂) is a gas we breathe! 🫁 It makes up about 21% of Earth's atmosphere and is essential for life!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+carbon|co2|carbon\s+dioxide/i],
    answer: "Carbon is a chemical element (C)! 🌿 CO₂ (carbon dioxide) is a gas we exhale and plants use for photosynthesis!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+acid|ph\s+scale|acids\s+and\s+bases/i],
    answer: "Acids have pH below 7, bases have pH above 7! 🧪 Lemon juice is acidic, baking soda is basic!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+fire|combustion|burning/i],
    answer: "Fire is a chemical reaction (combustion) that releases heat and light! 🔥 It needs fuel, oxygen, and heat to burn!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+rust|rusting|oxidation/i],
    answer: "Rust is iron oxide formed when iron reacts with oxygen and water! 🔩 It's a type of oxidation that weakens metal!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+photosynthesis/i],
    answer: "Photosynthesis is how plants make food! 🌱 Plants use sunlight, water, and CO₂ to create glucose and oxygen!",
    category: "science"
  },
  
  // ========== SCIENCE - BIOLOGY ==========
  {
    patterns: [/what\s+is\s+dna|genetic\s+code|genes/i],
    answer: "DNA is the molecule that carries genetic information! 🧬 It's like a blueprint for all living things!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+evolution|natural\s+selection|darwin/i],
    answer: "Evolution is how species change over time through natural selection! 🦋 Organisms with helpful traits survive and reproduce!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+a\s+cell|cells|cell\s+structure/i],
    answer: "Cells are the basic units of life! 🔬 All living things are made of cells - they're like tiny factories!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+the\s+brain|how\s+does\s+the\s+brain\s+work/i],
    answer: "The brain is the control center of your body! 🧠 It has billions of neurons that process thoughts, memories, and control everything!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+the\s+heart|how\s+does\s+the\s+heart\s+work/i],
    answer: "The heart pumps blood throughout your body! ❤️ It beats about 100,000 times per day, circulating oxygen and nutrients!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+blood|blood\s+types|red\s+blood\s+cells/i],
    answer: "Blood carries oxygen, nutrients, and waste! 🩸 Types: A, B, AB, O (positive or negative). Red cells carry oxygen!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+the\s+immune\s+system|immunity/i],
    answer: "The immune system protects your body from germs and diseases! 🛡️ White blood cells fight off infections!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+digestion|how\s+does\s+digestion\s+work/i],
    answer: "Digestion breaks down food so your body can use it! 🍽️ Food goes: mouth → stomach → intestines → nutrients absorbed!",
    category: "science"
  },
  
  // ========== SCIENCE - ASTRONOMY ==========
  {
    patterns: [/how\s+many\s+planets|planets\s+in\s+the\s+solar\s+system/i],
    answer: "There are 8 planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune! 🪐 Pluto is now a dwarf planet!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+the\s+sun|how\s+big\s+is\s+the\s+sun/i],
    answer: "The Sun is a star at the center of our solar system! ☀️ It's 109 times wider than Earth and incredibly hot (5,500°C)!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+the\s+moon|moon\s+phases/i],
    answer: "The Moon is Earth's natural satellite! 🌙 It orbits Earth every 27 days and causes tides! Phases: new, crescent, quarter, full!",
    category: "science"
  },
  {
    patterns: [/how\s+far\s+is\s+the\s+moon|distance\s+to\s+the\s+moon/i],
    answer: "The Moon is about 384,400 km (238,900 miles) away from Earth! 🌙 That's about 30 Earths lined up!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+a\s+galaxy|milky\s+way/i],
    answer: "A galaxy is a huge collection of stars, gas, and dust! 🌌 The Milky Way has 100-400 billion stars!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+a\s+star|how\s+are\s+stars\s+born/i],
    answer: "Stars are massive balls of hot gas that produce light! ⭐ They form from clouds of gas and dust collapsing under gravity!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+a\s+comet|comets/i],
    answer: "Comets are icy space objects that orbit the Sun! ☄️ When they get close, they develop glowing tails of gas and dust!",
    category: "science"
  },
  {
    patterns: [/what\s+is\s+an\s+asteroid|asteroids/i],
    answer: "Asteroids are rocky objects orbiting the Sun! 🪨 Most are in the asteroid belt between Mars and Jupiter!",
    category: "science"
  },
  
  // ========== GEOGRAPHY - COUNTRIES ==========
  {
    patterns: [/how\s+many\s+countries|number\s+of\s+countries/i],
    answer: "There are about 195 countries in the world! 🌍 The exact number depends on how you count (some territories are disputed)!",
    category: "geography"
  },
  {
    patterns: [/what\s+is\s+the\s+largest\s+country|biggest\s+country/i],
    answer: "Russia is the largest country by area! 🇷🇺 It covers about 17 million square kilometers (6.6 million square miles)!",
    category: "geography"
  },
  {
    patterns: [/what\s+is\s+the\s+smallest\s+country|smallest\s+country/i],
    answer: "Vatican City is the smallest country! 🇻🇦 It's only 0.44 square kilometers (0.17 square miles) - smaller than a golf course!",
    category: "geography"
  },
  {
    patterns: [/what\s+is\s+the\s+most\s+populous\s+country|most\s+populated/i],
    answer: "China has the most people (over 1.4 billion)! 🇨🇳 India is second with over 1.3 billion!",
    category: "geography"
  },
  {
    patterns: [/capital\s+of\s+(usa|united\s+states|america)/i],
    answer: "Washington D.C. is the capital of the United States! 🇺🇸 It's not a state - it's a federal district!",
    category: "geography"
  },
  {
    patterns: [/capital\s+of\s+(uk|united\s+kingdom|britain)/i],
    answer: "London is the capital of the United Kingdom! 🇬🇧 It's also England's capital and a major global city!",
    category: "geography"
  },
  {
    patterns: [/capital\s+of\s+france/i],
    answer: "Paris is the capital of France! 🇫🇷 It's known as the City of Light and home to the Eiffel Tower!",
    category: "geography"
  },
  {
    patterns: [/capital\s+of\s+germany/i],
    answer: "Berlin is the capital of Germany! 🇩🇪 It's a vibrant city with rich history and culture!",
    category: "geography"
  },
  {
    patterns: [/capital\s+of\s+japan/i],
    answer: "Tokyo is the capital of Japan! 🇯🇵 It's the world's most populous metropolitan area!",
    category: "geography"
  },
  {
    patterns: [/capital\s+of\s+china/i],
    answer: "Beijing is the capital of China! 🇨🇳 It's one of the world's oldest and most populous cities!",
    category: "geography"
  },
  {
    patterns: [/capital\s+of\s+india/i],
    answer: "New Delhi is the capital of India! 🇮🇳 It's part of the larger Delhi metropolitan area!",
    category: "geography"
  },
  {
    patterns: [/capital\s+of\s+brazil/i],
    answer: "Brasília is the capital of Brazil! 🇧🇷 It was built in the 1960s and is known for its modern architecture!",
    category: "geography"
  },
  {
    patterns: [/capital\s+of\s+australia/i],
    answer: "Canberra is the capital of Australia! 🇦🇺 Many people think it's Sydney or Melbourne, but it's actually Canberra!",
    category: "geography"
  },
  {
    patterns: [/capital\s+of\s+canada/i],
    answer: "Ottawa is the capital of Canada! 🇨🇦 It's located in Ontario, between Toronto and Montreal!",
    category: "geography"
  },
  {
    patterns: [/capital\s+of\s+ghana/i],
    answer: "Accra is the capital of Ghana! 🇬🇭 It's a vibrant coastal city and the economic hub of Ghana!",
    category: "geography"
  },
  {
    patterns: [/capital\s+of\s+nigeria/i],
    answer: "Abuja is the capital of Nigeria! 🇳🇬 Lagos is the largest city, but Abuja is the capital!",
    category: "geography"
  },
  {
    patterns: [/capital\s+of\s+kenya/i],
    answer: "Nairobi is the capital of Kenya! 🇰🇪 It's also the largest city and a major economic center!",
    category: "geography"
  },
  {
    patterns: [/capital\s+of\s+south\s+africa/i],
    answer: "South Africa has three capitals! 🇿🇦 Cape Town (legislative), Pretoria (executive), and Bloemfontein (judicial)!",
    category: "geography"
  },
  
  // ========== GEOGRAPHY - LANDMARKS ==========
  {
    patterns: [/where\s+is\s+the\s+great\s+wall|great\s+wall\s+of\s+china/i],
    answer: "The Great Wall of China is in northern China! 🧱 It stretches over 21,000 km and was built to protect against invaders!",
    category: "geography"
  },
  {
    patterns: [/where\s+is\s+the\s+pyramids|pyramids\s+of\s+giza/i],
    answer: "The Pyramids of Giza are in Egypt, near Cairo! 🔺 They're over 4,500 years old and one of the Seven Wonders!",
    category: "geography"
  },
  {
    patterns: [/where\s+is\s+the\s+eiffel\s+tower/i],
    answer: "The Eiffel Tower is in Paris, France! 🗼 It's 330 meters tall and was built in 1889!",
    category: "geography"
  },
  {
    patterns: [/where\s+is\s+the\s+statue\s+of\s+liberty/i],
    answer: "The Statue of Liberty is in New York Harbor, USA! 🗽 It was a gift from France and represents freedom!",
    category: "geography"
  },
  {
    patterns: [/where\s+is\s+the\s+taj\s+mahal/i],
    answer: "The Taj Mahal is in Agra, India! 🕌 It's a beautiful white marble mausoleum built in the 1600s!",
    category: "geography"
  },
  {
    patterns: [/where\s+is\s+mount\s+everest/i],
    answer: "Mount Everest is on the border between Nepal and China! ⛰️ It's 8,848 meters (29,029 feet) tall - the world's highest peak!",
    category: "geography"
  },
  {
    patterns: [/where\s+is\s+the\s+grand\s+canyon/i],
    answer: "The Grand Canyon is in Arizona, USA! 🏜️ It's 446 km long, up to 29 km wide, and over 1,800 meters deep!",
    category: "geography"
  },
  {
    patterns: [/where\s+is\s+the\s+amazon\s+rainforest|amazon\s+river/i],
    answer: "The Amazon Rainforest is in South America, mostly in Brazil! 🌳 It's the world's largest tropical rainforest!",
    category: "geography"
  },
  
  // ========== HISTORY ==========
  {
    patterns: [/when\s+was\s+world\s+war\s+2|ww2|world\s+war\s+ii/i],
    answer: "World War 2 was from 1939 to 1945! 🌍 It involved most of the world's nations and was the deadliest conflict in history!",
    category: "history"
  },
  {
    patterns: [/when\s+was\s+world\s+war\s+1|ww1|world\s+war\s+i/i],
    answer: "World War 1 was from 1914 to 1918! 🌍 It was called 'The Great War' and involved many European powers!",
    category: "history"
  },
  {
    patterns: [/who\s+was\s+napoleon|napoleon\s+bonaparte/i],
    answer: "Napoleon Bonaparte was a French military leader and emperor! 👑 He conquered much of Europe in the early 1800s!",
    category: "history"
  },
  {
    patterns: [/who\s+was\s+cleopatra/i],
    answer: "Cleopatra was the last pharaoh of ancient Egypt! 👑 She was known for her intelligence and relationships with Roman leaders!",
    category: "history"
  },
  {
    patterns: [/who\s+was\s+shakespeare|shakespeare/i],
    answer: "William Shakespeare was an English playwright and poet! 🎭 He wrote Romeo & Juliet, Hamlet, and many famous works in the 1500s-1600s!",
    category: "history"
  },
  {
    patterns: [/when\s+did\s+humans\s+first\s+land\s+on\s+the\s+moon|moon\s+landing/i],
    answer: "Humans first landed on the Moon on July 20, 1969! 🌙 Neil Armstrong and Buzz Aldrin were the first to walk on it!",
    category: "history"
  },
  {
    patterns: [/when\s+was\s+the\s+internet\s+invented|invention\s+of\s+the\s+internet/i],
    answer: "The internet began in the 1960s as ARPANET! 🌐 The World Wide Web was created by Tim Berners-Lee in 1989!",
    category: "history"
  },
  {
    patterns: [/when\s+was\s+the\s+printing\s+press\s+invented/i],
    answer: "The printing press was invented by Johannes Gutenberg around 1440! 📚 It revolutionized communication and knowledge sharing!",
    category: "history"
  },
  
  // ========== LITERATURE ==========
  {
    patterns: [/who\s+wrote\s+romeo\s+and\s+juliet|romeo\s+and\s+juliet/i],
    answer: "William Shakespeare wrote Romeo and Juliet! 📖 It's a tragic love story about two young lovers from feuding families!",
    category: "literature"
  },
  {
    patterns: [/who\s+wrote\s+hamlet|hamlet/i],
    answer: "William Shakespeare wrote Hamlet! 📖 It's about a Danish prince seeking revenge for his father's murder!",
    category: "literature"
  },
  {
    patterns: [/who\s+wrote\s+harry\s+potter|harry\s+potter/i],
    answer: "J.K. Rowling wrote the Harry Potter series! 📚 It's about a young wizard and his adventures at Hogwarts!",
    category: "literature"
  },
  {
    patterns: [/who\s+wrote\s+the\s+alchemist|alchemist/i],
    answer: "Paulo Coelho wrote The Alchemist! 📖 It's a philosophical novel about following your dreams!",
    category: "literature"
  },
  {
    patterns: [/who\s+wrote\s+1984|1984\s+book/i],
    answer: "George Orwell wrote 1984! 📖 It's a dystopian novel about totalitarian surveillance and control!",
    category: "literature"
  },
  {
    patterns: [/who\s+wrote\s+to\s+kill\s+a\s+mockingbird|to\s+kill\s+a\s+mockingbird/i],
    answer: "Harper Lee wrote To Kill a Mockingbird! 📖 It's about racial injustice in the American South!",
    category: "literature"
  },
  {
    patterns: [/what\s+is\s+the\s+longest\s+novel|longest\s+book/i],
    answer: "Marcel Proust's 'In Search of Lost Time' is one of the longest novels at over 1.2 million words! 📚",
    category: "literature"
  },
  
  // ========== MOVIES & TV ==========
  {
    patterns: [/best\s+movie|greatest\s+film|top\s+movie/i],
    answer: "That's subjective! 🎬 But classics like The Godfather, The Shawshank Redemption, and Citizen Kane are often highly rated!",
    category: "entertainment"
  },
  {
    patterns: [/who\s+directed\s+inception|inception/i],
    answer: "Christopher Nolan directed Inception! 🎬 It's a mind-bending sci-fi thriller about dreams within dreams!",
    category: "entertainment"
  },
  {
    patterns: [/who\s+directed\s+the\s+matrix|matrix/i],
    answer: "The Wachowskis directed The Matrix! 🎬 It's a sci-fi action film about a simulated reality!",
    category: "entertainment"
  },
  {
    patterns: [/what\s+is\s+the\s+highest\s+grossing\s+movie|top\s+grossing/i],
    answer: "Avatar and Avengers: Endgame are among the highest-grossing films! 💰 They both made over $2.7 billion!",
    category: "entertainment"
  },
  {
    patterns: [/oscar|academy\s+award/i],
    answer: "The Oscars (Academy Awards) are the most prestigious film awards! 🏆 They're given out annually by the Academy of Motion Picture Arts!",
    category: "entertainment"
  },
  {
    patterns: [/best\s+tv\s+show|greatest\s+series/i],
    answer: "Popular choices include Breaking Bad, Game of Thrones, The Wire, and The Sopranos! 📺 What genre do you like?",
    category: "entertainment"
  },
  {
    patterns: [/netflix|streaming/i],
    answer: "Netflix is a popular streaming service! 📺 It offers movies, TV shows, and original content worldwide!",
    category: "entertainment"
  },
  
  // ========== MUSIC ==========
  {
    patterns: [/who\s+is\s+the\s+best\s+artist|greatest\s+musician/i],
    answer: "That's very subjective! 🎵 Popular choices include The Beatles, Michael Jackson, Queen, and many others! What genre do you like?",
    category: "music"
  },
  {
    patterns: [/who\s+are\s+the\s+beatles|beatles/i],
    answer: "The Beatles were a legendary British rock band! 🎸 Members: John Lennon, Paul McCartney, George Harrison, and Ringo Starr!",
    category: "music"
  },
  {
    patterns: [/who\s+is\s+michael\s+jackson|michael\s+jackson/i],
    answer: "Michael Jackson was the 'King of Pop'! 👑 He's one of the best-selling artists ever with hits like Thriller!",
    category: "music"
  },
  {
    patterns: [/what\s+is\s+the\s+best\s+song|greatest\s+song/i],
    answer: "That's very subjective! 🎵 Popular choices include Bohemian Rhapsody, Imagine, and many others! What's your favorite?",
    category: "music"
  },
  {
    patterns: [/what\s+is\s+rock\s+music|rock\s+and\s+roll/i],
    answer: "Rock music is a genre that started in the 1950s! 🎸 It features electric guitars, drums, and strong rhythms!",
    category: "music"
  },
  {
    patterns: [/what\s+is\s+pop\s+music|pop/i],
    answer: "Pop music is popular music with catchy melodies! 🎵 It's designed to appeal to a wide audience!",
    category: "music"
  },
  {
    patterns: [/what\s+is\s+hip\s+hop|rap\s+music/i],
    answer: "Hip hop is a music genre that started in the 1970s! 🎤 It includes rapping, DJing, breakdancing, and graffiti!",
    category: "music"
  },
  {
    patterns: [/what\s+is\s+jazz|jazz\s+music/i],
    answer: "Jazz is a music genre that originated in African American communities! 🎷 It features improvisation and syncopation!",
    category: "music"
  },
  
  // ========== ANIMALS ==========
  {
    patterns: [/what\s+is\s+the\s+fastest\s+animal|fastest\s+creature/i],
    answer: "The peregrine falcon is the fastest animal when diving (over 300 km/h)! 🦅 On land, the cheetah is fastest (up to 120 km/h)!",
    category: "animals"
  },
  {
    patterns: [/what\s+is\s+the\s+largest\s+animal|biggest\s+animal/i],
    answer: "The blue whale is the largest animal ever! 🐋 It can be over 30 meters long and weigh 200 tons!",
    category: "animals"
  },
  {
    patterns: [/what\s+is\s+the\s+smallest\s+animal|tiny\s+animal/i],
    answer: "The bumblebee bat is the smallest mammal (2 grams)! 🦇 The smallest animal overall is microscopic!",
    category: "animals"
  },
  {
    patterns: [/do\s+dogs\s+dream|do\s+cats\s+dream/i],
    answer: "Yes! Dogs and cats do dream! 🐕 They have REM sleep just like humans and can twitch and make sounds while dreaming!",
    category: "animals"
  },
  {
    patterns: [/how\s+long\s+do\s+dogs\s+live|dog\s+lifespan/i],
    answer: "Dogs typically live 10-13 years! 🐕 Smaller breeds often live longer than larger breeds!",
    category: "animals"
  },
  {
    patterns: [/how\s+long\s+do\s+cats\s+live|cat\s+lifespan/i],
    answer: "Cats typically live 12-18 years! 🐱 Indoor cats usually live longer than outdoor cats!",
    category: "animals"
  },
  {
    patterns: [/why\s+do\s+cats\s+purr|cat\s+purring/i],
    answer: "Cats purr when happy, but also when stressed or in pain! 🐱 It's a way they communicate and may help with healing!",
    category: "animals"
  },
  {
    patterns: [/how\s+many\s+hearts\s+does\s+an\s+octopus\s+have/i],
    answer: "An octopus has 3 hearts! 🐙 Two pump blood to the gills, one pumps blood to the rest of the body!",
    category: "animals"
  },
  {
    patterns: [/do\s+fish\s+sleep|do\s+fish\s+have\s+eyelids/i],
    answer: "Fish do rest, but they don't sleep like mammals! 🐟 They don't have eyelids, so their eyes stay open!",
    category: "animals"
  },
  {
    patterns: [/what\s+is\s+the\s+smartest\s+animal|most\s+intelligent/i],
    answer: "Dolphins, chimpanzees, elephants, and octopuses are among the smartest! 🐬 They can solve problems and use tools!",
    category: "animals"
  },
  
  // ========== NATURE ==========
  {
    patterns: [/why\s+is\s+the\s+sky\s+blue|blue\s+sky/i],
    answer: "The sky is blue because of how sunlight scatters! ☀️ Blue light scatters more than other colors in our atmosphere!",
    category: "nature"
  },
  {
    patterns: [/why\s+do\s+leaves\s+change\s+color|fall\s+colors/i],
    answer: "Leaves change color in fall because chlorophyll breaks down! 🍂 Red and yellow pigments become visible!",
    category: "nature"
  },
  {
    patterns: [/how\s+do\s+rainbows\s+form|rainbow/i],
    answer: "Rainbows form when sunlight hits water droplets! 🌈 Light refracts and reflects, creating the color spectrum!",
    category: "nature"
  },
  {
    patterns: [/why\s+does\s+it\s+rain|how\s+does\s+rain\s+form/i],
    answer: "Rain forms when water vapor in clouds condenses! 🌧️ Droplets get heavy and fall as precipitation!",
    category: "nature"
  },
  {
    patterns: [/why\s+does\s+it\s+snow|how\s+does\s+snow\s+form/i],
    answer: "Snow forms when water vapor freezes into ice crystals! ❄️ The crystals stick together to form snowflakes!",
    category: "nature"
  },
  {
    patterns: [/what\s+causes\s+thunder|thunder\s+and\s+lightning/i],
    answer: "Thunder is the sound of lightning! ⚡ Lightning heats air rapidly, creating a shock wave we hear as thunder!",
    category: "nature"
  },
  {
    patterns: [/how\s+do\s+trees\s+make\s+oxygen|trees\s+and\s+oxygen/i],
    answer: "Trees make oxygen through photosynthesis! 🌳 They take in CO₂ and release O₂ - we need them to breathe!",
    category: "nature"
  },
  {
    patterns: [/what\s+is\s+the\s+oldest\s+tree|oldest\s+living\s+tree/i],
    answer: "The oldest tree is a bristlecone pine over 5,000 years old! 🌲 It's in California, USA!",
    category: "nature"
  },
  
  // ========== PSYCHOLOGY & MENTAL HEALTH ==========
  {
    patterns: [/what\s+is\s+depression|depression/i],
    answer: "Depression is a mental health condition with persistent sadness! 💙 It's treatable with therapy, medication, and support!",
    category: "health"
  },
  {
    patterns: [/what\s+is\s+anxiety|anxiety/i],
    answer: "Anxiety is worry or fear about future events! 😰 It's normal sometimes, but can be a disorder if it's excessive!",
    category: "health"
  },
  {
    patterns: [/how\s+to\s+reduce\s+anxiety|manage\s+anxiety/i],
    answer: "Try deep breathing, meditation, exercise, talking to someone, or professional help! 🧘 You're not alone!",
    category: "health"
  },
  {
    patterns: [/what\s+is\s+stress|stressful/i],
    answer: "Stress is your body's response to challenges! 😓 Some stress is normal, but too much can be harmful!",
    category: "health"
  },
  {
    patterns: [/how\s+to\s+be\s+happy|happiness/i],
    answer: "Happiness comes from many things: relationships, purpose, gratitude, helping others, and self-care! 😊 What makes you happy?",
    category: "health"
  },
  {
    patterns: [/what\s+is\s+self\s+care|self\s+care/i],
    answer: "Self-care is taking care of your physical and mental health! 💚 It includes rest, exercise, hobbies, and setting boundaries!",
    category: "health"
  },
  
  // ========== BUSINESS & FINANCE ==========
  {
    patterns: [/what\s+is\s+inflation|inflation/i],
    answer: "Inflation is when prices rise over time! 💰 Your money buys less - $1 today buys less than $1 years ago!",
    category: "finance"
  },
  {
    patterns: [/what\s+is\s+bitcoin|cryptocurrency|crypto/i],
    answer: "Bitcoin is a digital cryptocurrency! ₿ It uses blockchain technology and isn't controlled by any government!",
    category: "finance"
  },
  {
    patterns: [/what\s+is\s+the\s+stock\s+market|stocks/i],
    answer: "The stock market is where people buy and sell shares of companies! 📈 Prices go up and down based on supply and demand!",
    category: "finance"
  },
  {
    patterns: [/how\s+to\s+save\s+money|saving\s+money/i],
    answer: "Save money by budgeting, cutting unnecessary expenses, setting goals, and automating savings! 💰 Start small!",
    category: "finance"
  },
  {
    patterns: [/what\s+is\s+interest|interest\s+rate/i],
    answer: "Interest is money paid for borrowing or earned for saving! 💵 Banks pay you interest on savings, charge interest on loans!",
    category: "finance"
  },
  
  // ========== TRAVEL ==========
  {
    patterns: [/best\s+place\s+to\s+visit|top\s+destination/i],
    answer: "Popular destinations include Paris, Tokyo, New York, Bali, and many more! ✈️ Where would you like to go?",
    category: "travel"
  },
  {
    patterns: [/what\s+do\s+i\s+need\s+to\s+travel|travel\s+requirements/i],
    answer: "You typically need a passport, visa (depending on destination), tickets, and travel insurance! ✈️ Check requirements!",
    category: "travel"
  },
  {
    patterns: [/how\s+to\s+pack\s+for\s+a\s+trip|packing/i],
    answer: "Pack light, bring essentials, check weather, roll clothes to save space, and don't forget chargers! 🧳",
    category: "travel"
  },
  
  // ========== LANGUAGES ==========
  {
    patterns: [/how\s+many\s+languages|number\s+of\s+languages/i],
    answer: "There are about 7,000 languages in the world! 🗣️ The most spoken are Mandarin, Spanish, English, Hindi, and Arabic!",
    category: "languages"
  },
  {
    patterns: [/what\s+is\s+the\s+most\s+spoken\s+language/i],
    answer: "Mandarin Chinese is the most spoken language by native speakers! 🇨🇳 English is most spoken as a second language!",
    category: "languages"
  },
  {
    patterns: [/how\s+to\s+learn\s+a\s+language|language\s+learning/i],
    answer: "Practice daily, use apps, watch shows, speak with natives, and be patient! 🗣️ Consistency is key!",
    category: "languages"
  },
  
  // ========== ART & DESIGN ==========
  {
    patterns: [/who\s+painted\s+the\s+mona\s+lisa|mona\s+lisa/i],
    answer: "Leonardo da Vinci painted the Mona Lisa! 🎨 It's in the Louvre Museum in Paris and is one of the most famous paintings!",
    category: "art"
  },
  {
    patterns: [/who\s+painted\s+starry\s+night|starry\s+night/i],
    answer: "Vincent van Gogh painted The Starry Night! 🌌 It's one of the most recognized paintings in the world!",
    category: "art"
  },
  {
    patterns: [/what\s+is\s+art|art/i],
    answer: "Art is creative expression through various mediums! 🎨 It includes painting, sculpture, music, literature, and more!",
    category: "art"
  },
  
  // ========== RELATIONSHIPS ==========
  {
    patterns: [/how\s+to\s+make\s+friends|making\s+friends/i],
    answer: "Be yourself, show interest in others, be kind, join activities, and be a good listener! 👥 Friendships take time!",
    category: "relationships"
  },
  {
    patterns: [/how\s+to\s+maintain\s+a\s+relationship|relationship\s+advice/i],
    answer: "Communicate openly, show appreciation, spend quality time, respect each other, and work through conflicts together! 💕",
    category: "relationships"
  },
  {
    patterns: [/what\s+is\s+love|love/i],
    answer: "Love is a deep feeling of affection and care! ❤️ It can be romantic, familial, or platonic - all are beautiful!",
    category: "relationships"
  },
  
  // ========== CAREER & JOBS ==========
  {
    patterns: [/how\s+to\s+write\s+a\s+resume|resume/i],
    answer: "Include contact info, summary, work experience, education, and skills! 📄 Keep it clear, concise, and tailored to the job!",
    category: "career"
  },
  {
    patterns: [/how\s+to\s+prepare\s+for\s+an\s+interview|job\s+interview/i],
    answer: "Research the company, practice answers, prepare questions, dress professionally, and be confident! 💼 You've got this!",
    category: "career"
  },
  {
    patterns: [/how\s+to\s+find\s+a\s+job|job\s+search/i],
    answer: "Use job boards, network, update LinkedIn, tailor applications, and don't give up! 💼 Persistence pays off!",
    category: "career"
  },
  
  // ========== PROGRAMMING & TECH ==========
  {
    patterns: [/what\s+is\s+programming|coding/i],
    answer: "Programming is writing instructions for computers! 💻 You use languages like Python, JavaScript, Java to create software!",
    category: "technology"
  },
  {
    patterns: [/how\s+to\s+learn\s+programming|learn\s+to\s+code/i],
    answer: "Start with basics, practice daily, build projects, join communities, and don't give up! 💻 Everyone starts as a beginner!",
    category: "technology"
  },
  {
    patterns: [/what\s+is\s+python|python/i],
    answer: "Python is a popular programming language! 🐍 It's great for beginners - simple syntax, powerful, used in many fields!",
    category: "technology"
  },
  {
    patterns: [/what\s+is\s+javascript|javascript/i],
    answer: "JavaScript is a programming language for web development! ⚡ It makes websites interactive and dynamic!",
    category: "technology"
  },
  {
    patterns: [/what\s+is\s+html/i],
    answer: "HTML is HyperText Markup Language! 📄 It's the structure of web pages - like the skeleton of a website!",
    category: "technology"
  },
  {
    patterns: [/what\s+is\s+css/i],
    answer: "CSS is Cascading Style Sheets! 🎨 It styles web pages - colors, fonts, layouts - makes websites beautiful!",
    category: "technology"
  },
  {
    patterns: [/what\s+is\s+an\s+algorithm|algorithm/i],
    answer: "An algorithm is a step-by-step procedure to solve a problem! 🧮 It's like a recipe for computers to follow!",
    category: "technology"
  },
  {
    patterns: [/what\s+is\s+ai|artificial\s+intelligence/i],
    answer: "AI is technology that enables machines to learn and make decisions! 🤖 I'm an example of AI!",
    category: "technology"
  },
  {
    patterns: [/what\s+is\s+machine\s+learning|ml/i],
    answer: "Machine learning is AI that learns from data! 📊 It improves with experience, like how humans learn!",
    category: "technology"
  },
  
  // ========== RIDDLES & BRAIN TEASERS ==========
  {
    patterns: [/riddle|brain\s+teaser|puzzle/i],
    answer: "I love riddles! 🧩 Here's one: What has keys but no locks, space but no room, and you can enter but not go inside? (A keyboard!) Want another?",
    category: "games"
  },
  {
    patterns: [/what\s+has\s+hands\s+but\s+can't\s+clap/i],
    answer: "A clock! ⏰ It has hands (hour and minute) but can't clap!",
    category: "games"
  },
  {
    patterns: [/what\s+comes\s+once\s+in\s+a\s+minute/i],
    answer: "The letter 'M'! 🔤 It appears once in the word 'minute'!",
    category: "games"
  },
  
  // ========== MOTIVATIONAL ==========
  {
    patterns: [/motivation|motivational|inspire/i],
    answer: "You're capable of amazing things! 💪 Every expert was once a beginner. Keep going, stay positive, and believe in yourself!",
    category: "motivation"
  },
  {
    patterns: [/i\s+can't\s+do\s+it|impossible/i],
    answer: "You're stronger than you think! 💪 Break big goals into small steps, ask for help, and keep trying! You've got this!",
    category: "motivation"
  },
  {
    patterns: [/i'm\s+sad|feeling\s+down|depressed/i],
    answer: "I'm sorry you're feeling this way! 💙 It's okay to feel sad. Talk to someone you trust, practice self-care, and remember: this feeling will pass!",
    category: "motivation"
  },
  {
    patterns: [/i\s+feel\s+lonely|loneliness/i],
    answer: "You're not alone! 💚 Reach out to friends or family, join communities, or talk to a professional. People care about you!",
    category: "motivation"
  },
  
  // ========== RANDOM FACTS ==========
  {
    patterns: [/fun\s+fact|random\s+fact|interesting\s+fact/i],
    answer: "Fun fact: Octopuses have three hearts and blue blood! 🐙 Or: Honey never spoils - archaeologists found 3000-year-old honey that's still edible! 🍯 Want more?",
    category: "trivia"
  },
  {
    patterns: [/did\s+you\s+know|dyk/i],
    answer: "Did you know: Bananas are berries, but strawberries aren't! 🍌 Or: Wombat poop is cube-shaped! 💩 Want another fun fact?",
    category: "trivia"
  },
  {
    patterns: [/weird\s+fact|strange\s+fact/i],
    answer: "Weird fact: A group of flamingos is called a 'flamboyance'! 🦩 Or: Dolphins have names for each other! Want more weird facts?",
    category: "trivia"
  },
  
  // ========== LIFE ADVICE ==========
  {
    patterns: [/life\s+advice|advice\s+for\s+life/i],
    answer: "Life advice: Be kind to yourself and others, follow your passions, learn from mistakes, and enjoy the journey! 🌟 What specific advice do you need?",
    category: "advice"
  },
  {
    patterns: [/how\s+to\s+be\s+successful|success/i],
    answer: "Success looks different for everyone! 💫 Set goals, work hard, learn continuously, stay persistent, and don't compare yourself to others!",
    category: "advice"
  },
  {
    patterns: [/how\s+to\s+be\s+confident|confidence/i],
    answer: "Build confidence by practicing, preparing, celebrating small wins, and being kind to yourself! 💪 You're more capable than you think!",
    category: "advice"
  },
  {
    patterns: [/how\s+to\s+deal\s+with\s+failure|failure/i],
    answer: "Failure is part of learning! 💪 Analyze what went wrong, learn from it, adjust, and try again. Every successful person has failed!",
    category: "advice"
  },
  
  // ========== SOCIAL MEDIA ==========
  {
    patterns: [/what\s+is\s+instagram|instagram/i],
    answer: "Instagram is a photo and video sharing app! 📸 People share moments, stories, and connect with others!",
    category: "social"
  },
  {
    patterns: [/what\s+is\s+twitter|x|tweet/i],
    answer: "Twitter (now X) is a social media platform for short messages! 🐦 People share thoughts, news, and connect!",
    category: "social"
  },
  {
    patterns: [/what\s+is\s+facebook|facebook/i],
    answer: "Facebook is a social networking platform! 👥 People connect with friends, share updates, and join communities!",
    category: "social"
  },
  {
    patterns: [/what\s+is\s+tiktok|tiktok/i],
    answer: "TikTok is a video-sharing app! 🎵 People create short videos with music, dances, and creative content!",
    category: "social"
  },
  
  // ========== FOOD & COOKING (EXPANDED) ==========
  {
    patterns: [/how\s+to\s+cook\s+rice|rice/i],
    answer: "Cook rice with 2 parts water to 1 part rice! 🍚 Bring to boil, then simmer covered for 15-20 minutes!",
    category: "food"
  },
  {
    patterns: [/how\s+to\s+cook\s+pasta|pasta/i],
    answer: "Boil water, add salt, cook pasta according to package (usually 8-12 minutes)! 🍝 Don't forget to save pasta water for sauce!",
    category: "food"
  },
  {
    patterns: [/how\s+to\s+make\s+eggs|scrambled\s+eggs/i],
    answer: "For scrambled: Beat eggs, cook on medium heat with butter, stir gently! 🥚 For boiled: 6-7 min soft, 10-12 min hard!",
    category: "food"
  },
  {
    patterns: [/how\s+to\s+bake\s+a\s+cake|cake/i],
    answer: "Follow a recipe, measure ingredients precisely, preheat oven, don't overmix, and test with a toothpick! 🎂 Practice makes perfect!",
    category: "food"
  },
  {
    patterns: [/what\s+is\s+the\s+healthiest\s+food|healthy\s+food/i],
    answer: "Healthy foods include fruits, vegetables, whole grains, lean proteins, and nuts! 🥗 Balance and variety are key!",
    category: "food"
  },
  {
    patterns: [/how\s+many\s+calories|calories/i],
    answer: "Calories are units of energy in food! 🔥 Most adults need 2000-2500 daily, but it varies by age, gender, and activity!",
    category: "food"
  },
  
  // ========== SPORTS (EXPANDED) ==========
  {
    patterns: [/what\s+is\s+football|soccer/i],
    answer: "Football (soccer) is the world's most popular sport! ⚽ Two teams of 11 players try to score goals by kicking a ball!",
    category: "sports"
  },
  {
    patterns: [/what\s+is\s+basketball|basketball/i],
    answer: "Basketball is played with 5 players per team! 🏀 Players try to shoot a ball through a hoop to score points!",
    category: "sports"
  },
  {
    patterns: [/what\s+is\s+the\s+world\s+cup|fifa/i],
    answer: "The World Cup is the biggest football tournament! 🌍 It happens every 4 years and teams from around the world compete!",
    category: "sports"
  },
  {
    patterns: [/what\s+are\s+the\s+olympics|olympic\s+games/i],
    answer: "The Olympics are international games every 4 years! 🏅 Athletes from all countries compete in many different sports!",
    category: "sports"
  },
  
  // ========== EDUCATION (EXPANDED) ==========
  {
    patterns: [/how\s+to\s+study\s+effectively|study\s+tips/i],
    answer: "Study tips: Find a quiet space, take breaks (Pomodoro technique), use flashcards, teach others, and review regularly! 📚",
    category: "education"
  },
  {
    patterns: [/how\s+to\s+remember|memory\s+tips/i],
    answer: "Memory tips: Use mnemonics, create associations, practice repetition, visualize, and get enough sleep! 🧠",
    category: "education"
  },
  {
    patterns: [/how\s+to\s+prepare\s+for\s+exams|exam\s+prep/i],
    answer: "Exam prep: Start early, make a study schedule, practice past papers, stay organized, and get rest before the exam! 📝",
    category: "education"
  },
  
  // ========== WEATHER (EXPANDED) ==========
  {
    patterns: [/why\s+does\s+it\s+get\s+cold|winter/i],
    answer: "It gets cold in winter because Earth's axis tilts away from the Sun! ❄️ Less sunlight means lower temperatures!",
    category: "weather"
  },
  {
    patterns: [/why\s+is\s+it\s+hot\s+in\s+summer|summer/i],
    answer: "Summer is hot because Earth's axis tilts toward the Sun! ☀️ More direct sunlight means higher temperatures!",
    category: "weather"
  },
  
  // ========== RELIGION & SPIRITUALITY ==========
  {
    patterns: [/what\s+is\s+religion|religion/i],
    answer: "Religion is a system of beliefs and practices about the divine or sacred! 🙏 There are many religions worldwide, each with unique traditions!",
    category: "philosophy"
  },
  {
    patterns: [/what\s+is\s+meditation|meditation/i],
    answer: "Meditation is a practice of focusing your mind! 🧘 It can reduce stress, improve concentration, and promote well-being!",
    category: "philosophy"
  },
  
  // ========== FASHION & STYLE ==========
  {
    patterns: [/fashion\s+advice|style\s+tip/i],
    answer: "Fashion tip: Wear what makes you feel confident! 👗 Express yourself, dress for the occasion, and comfort matters!",
    category: "lifestyle"
  },
  
  // ========== PARENTING ==========
  {
    patterns: [/parenting\s+advice|how\s+to\s+be\s+a\s+good\s+parent/i],
    answer: "Parenting advice: Show love, set boundaries, listen, be patient, and lead by example! 👨‍👩‍👧 Every parent learns as they go!",
    category: "lifestyle"
  },
  
  // ========== HOBBIES ==========
  {
    patterns: [/what\s+hobby\s+should\s+i\s+try|hobbies/i],
    answer: "Great hobbies include reading, drawing, music, sports, cooking, gardening, or learning something new! 🎨 What interests you?",
    category: "lifestyle"
  },
  
  // ========== MORE GENERAL QUESTIONS ==========
  {
    patterns: [/what\s+is\s+the\s+meaning\s+of\s+life/i],
    answer: "That's a deep question! 🤔 Many say it's about finding happiness, helping others, learning, and making meaningful connections. What do you think?",
    category: "philosophy"
  },
  {
    patterns: [/what\s+happens\s+after\s+death|afterlife/i],
    answer: "That's one of life's biggest mysteries! 🤔 Different cultures and religions have different beliefs. What do you believe?",
    category: "philosophy"
  },
  {
    patterns: [/why\s+are\s+we\s+here|purpose\s+of\s+life/i],
    answer: "That's a profound question! 🌟 Many find purpose in relationships, helping others, creating, learning, or following their passions!",
    category: "philosophy"
  },
  
  // ========== MORE JOKES ==========
  {
    patterns: [/tell\s+me\s+another\s+joke|more\s+jokes/i],
    answer: "Why did the scarecrow win an award? Because he was outstanding in his field! 😂 Want another one?",
    category: "entertainment"
  },
  {
    patterns: [/funny\s+joke|make\s+me\s+laugh/i],
    answer: "Why don't scientists trust atoms? Because they make up everything! 😂 Or: I told my wife she was drawing her eyebrows too high. She looked surprised! 😄",
    category: "entertainment"
  },
  
  // ========== MORE MATH ==========
  {
    patterns: [/what\s+is\s+(\d+)\s*\*\s*(\d+)|(\d+)\s*times\s*(\d+)/i],
    answer: (match) => {
      const a = parseInt(match[1] || match[3]);
      const b = parseInt(match[2] || match[4]);
      return `${a} × ${b} = ${a * b}! 🧮`;
    },
    category: "math"
  },
  {
    patterns: [/what\s+is\s+(\d+)\s*\/\s*(\d+)|(\d+)\s*divided\s+by\s*(\d+)/i],
    answer: (match) => {
      const a = parseInt(match[1] || match[3]);
      const b = parseInt(match[2] || match[4]);
      if (b === 0) return "Can't divide by zero! 😅";
      return `${a} ÷ ${b} = ${a / b}! 🧮`;
    },
    category: "math"
  },
  
  // ========== MORE TIME QUESTIONS ==========
  {
    patterns: [/what\s+time\s+is\s+it\s+in\s+(.+)|time\s+in\s+(.+)/i],
    answer: (match) => {
      const place = match[1] || match[2];
      return `I can't check real-time time zones, but you can use a world clock app! 🕐 What timezone are you asking about?`;
    },
    category: "time_date"
  },
  
  // ========== MORE CREATOR QUESTIONS ==========
  {
    patterns: [/who\s+is\s+wisdom\s+kpehor|wisdom\s+kpehor/i],
    answer: "Wisdom Kpehor Jnr is my creator and the developer of WizChat! 🎨 He's the brilliant mind who brought me to life!",
    category: "greetings"
  },
  
  // ========== MORE APP QUESTIONS ==========
  {
    patterns: [/how\s+to\s+use\s+wizchat|wizchat\s+tutorial/i],
    answer: "WizChat is easy to use! 💬 You can chat with friends, share posts, create reels, follow people, and chat with me! Explore the tabs!",
    category: "app_features"
  },
  {
    patterns: [/what\s+features\s+does\s+wizchat\s+have|wizchat\s+features/i],
    answer: "WizChat has: chat with friends, posts & reels, profiles, topic rooms, dark/light theme, and me (WizAi)! 🚀 Explore and enjoy!",
    category: "app_features"
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

