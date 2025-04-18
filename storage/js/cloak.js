// storage/js/cloak.js

function setCloak(preset) {
  const tabSettings = {
    google: {
      title: "Google",
      favicon: "https://www.google.com/favicon.ico",
      description: "Search the world's information, including webpages, images, videos and more."
    },
    gmail: {
      title: "Gmail",
      favicon: "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico",
      description: "Gmail is email that's intuitive, efficient, and useful."
    },
    bing: {
      title: "Bing",
      favicon: "https://www.bing.com/sa/simg/favicon-2x.ico",
      description: "Bing helps you turn information into action, making it faster and easier to go from searching to doing."
    },
    desmos: {
      title: "Desmos | Graphing Calculator",
      favicon: "https://www.desmos.com/favicon.ico",
      description: "Explore math with Desmos!"
    },
    games: {
      title: "Games - Free Games",
      favicon: "https://example.com/games-icon.png", // replace with your actual icon
      description: "Play games for free online."
    },
    apps: {
      title: "Apps - Web Apps",
      favicon: "https://example.com/apps-icon.png", // replace with your actual icon
      description: "Browse web apps for productivity."
    }
  };

  const info = tabSettings[preset];

  if (info) {
    document.title = info.title;

    // Set favicon
    let favicon = document.querySelector("link[rel~='icon']");
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = info.favicon;

    // Set description
    let metaDesc = document.querySelector("meta[name='description']");
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = info.description;

    // Save in localStorage
    localStorage.setItem('tabCloak', preset);
  }
}

function resetCloak() {
  document.title = "Reid | Verse";
  
  // Reset favicon
  let favicon = document.querySelector("link[rel~='icon']");
  if (favicon) {
    favicon.href = "/favicon.ico"; // Default favicon
  }

  // Reset description
  let metaDesc = document.querySelector("meta[name='description']");
  if (metaDesc) {
    metaDesc.content = "Welcome to Reid Verse. Play games and more!";
  }

  localStorage.removeItem('tabCloak');
}
