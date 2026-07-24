import {
  loginWithSpotify,
  handleSpotifyCallback,
  getValidAccessToken
} from "./auth.js";

const versionElement = document.querySelector(".version");
const loginButton = document.getElementById("loginButton");

versionElement.textContent = `Version ${CONFIG.version}`;

async function initializeApp() {
  loginButton.disabled = true;
  loginButton.textContent = "Initialisation…";

  try {
    await handleSpotifyCallback();

    const accessToken = await getValidAccessToken();

    if (accessToken) {
      loginButton.textContent = "Spotify connecté ✓";
      loginButton.disabled = true;
    } else {
      loginButton.textContent = "Se connecter à Spotify";
      loginButton.disabled = false;
    }
  } catch (error) {
    console.error(error);

    loginButton.textContent = "Réessayer la connexion";
    loginButton.disabled = false;

    alert(error.message);
  }
}

loginButton.addEventListener("click", async () => {
  loginButton.disabled = true;
  loginButton.textContent = "Redirection vers Spotify…";

  try {
    await loginWithSpotify();
  } catch (error) {
    console.error(error);

    loginButton.disabled = false;
    loginButton.textContent = "Se connecter à Spotify";

    alert("Impossible de démarrer la connexion Spotify.");
  }
});

initializeApp();