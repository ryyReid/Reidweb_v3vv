document.getElementById('cloakBtn').addEventListener('click', function() {
    const element = document.getElementById('cloakableElement');
    const siteName = document.getElementById('siteName');
    const logo = document.getElementById('logo');

    // Toggle cloaking visibility
    element.classList.toggle('cloaked');

    // Change the site name, logo, and tab title when cloaked
    if (element.classList.contains('cloaked')) {
        siteName.textContent = 'GG';  // Change the name to "GG"
        logo.src = 'logo2.png';  // Change the logo to a new one
        document.title = 'GG';  // Change the browser tab name to "GG"
    } else {
        siteName.textContent = 'My Website';  // Reset the name
        logo.src = 'logo1.png';  // Reset the logo
        document.title = 'My Website';  // Reset the browser tab name to "My Website"
    }
});
