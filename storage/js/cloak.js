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
      description: "Bing helps you turn information into action."
    },
    desmos: {
      title: "Desmos | Graphing Calculator",
      favicon: "https://www.desmos.com/favicon.ico",
      description: "Explore math with Desmos!"
    }
  };

  const info = tabSettings[preset];
  if (!info) return;

  // Title
  document.title = info.title;

  // Favicon
  let favicon = 
      document.querySelector("link[rel='icon']") ||
      document.querySelector("link[rel='shortcut icon']");

  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }
  favicon.href = info.favicon;

  // Description
  let metaDesc = document.querySelector("meta[name='description']");
  if (!metaDesc) {
    metaDesc = document.createElement("meta");
    metaDesc.name = "description";
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = info.description;
}
