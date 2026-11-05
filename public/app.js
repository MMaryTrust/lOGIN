const app = document.querySelector('#app');

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

function renderSignIn(message = '') {
  app.innerHTML = `
    <section class="login-layout">
      <div class="login-story">
        <a class="brand" href="./" aria-label="Mannin Suvai home">
          <span class="brand-mark" aria-hidden="true">ம</span>
          <span><strong>Mannin Suvai</strong><small>Taste of the land</small></span>
        </a>
        <div class="story-copy">
          <p class="eyebrow">A taste of home</p>
          <h1>Heritage food,<br><em>made with care.</em></h1>
          <p>Traditional meals inspired by Thanjavur and Pudukkottai, prepared with care for families and elders.</p>
        </div>
        <p class="story-foot">மண்ணின் சுவை · The taste of the land</p>
      </div>

      <div class="login-panel">
        <form class="login-card" id="login-form">
          <p class="eyebrow">Welcome back</p>
          <h2>Sign in</h2>
          <p class="muted">Use your Mannin Suvai account to continue.</p>
          <label for="email">Email address</label>
          <input id="email" name="email" type="email" maxlength="254" autocomplete="username" required>
          <label for="password">Password</label>
          <input id="password" name="password" type="password" minlength="8" maxlength="12" autocomplete="current-password" aria-describedby="password-help" required>
          <p class="field-help" id="password-help">Password must be 8–12 characters.</p>
          <p class="form-message" id="form-message" role="alert">${escapeHtml(message)}</p>
          <button class="button" type="submit">Sign in</button>
          <p class="small muted">Need access? Contact your Mannin Suvai administrator.</p>
        </form>
      </div>
    </section>
  `;

  const form = document.querySelector('#login-form');
  form.addEventListener('submit', signIn);
}

function renderHome(user) {
  const name = user.name || user.email || 'there';
  app.innerHTML = `
    <header class="site-header">
      <a class="brand" href="./" aria-label="Mannin Suvai home">
        <span class="brand-mark" aria-hidden="true">ம</span>
        <span><strong>Mannin Suvai</strong><small>Taste of the land</small></span>
      </a>
      <button class="button button-outline" id="sign-out" type="button">Sign out</button>
    </header>
    <p class="home-message" id="home-message" role="alert"></p>
    <section class="home-hero">
      <div class="home-copy">
        <p class="eyebrow">Welcome, ${escapeHtml(name)}</p>
        <h1>The <em>taste of the land</em>, three times a day.</h1>
        <p class="lead">Thanjavur and Pudukkottai home cooking, prepared with traditional ingredients and care for your family.</p>
      </div>
      <div class="hero-art" role="img" aria-label="Illustration of a traditional meal">
        <span class="sun"></span><span class="plate"><span></span></span>
      </div>
    </section>
    <section class="home-details">
      <p class="eyebrow">Mannin Suvai</p>
      <h2>Food that feels like home.</h2>
      <div class="values">
        <article><span aria-hidden="true">01</span><h3>Rooted in tradition</h3><p>Recipes inspired by the kitchens and food heritage of Tamil Nadu.</p></article>
        <article><span aria-hidden="true">02</span><h3>Made with care</h3><p>Thoughtful meals prepared with attention to the people around your table.</p></article>
        <article><span aria-hidden="true">03</span><h3>Here for family</h3><p>A warm, familiar food experience for families and elders.</p></article>
      </div>
    </section>
    <footer class="site-footer">மண்ணின் சுவை <span>·</span> The taste of the land</footer>
  `;

  document.querySelector('#sign-out').addEventListener('click', signOut);
}

function showMessage(message) {
  const element = document.querySelector('#form-message');
  if (element) element.textContent = message;
}

async function signIn(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const values = new FormData(form);
  button.disabled = true;
  showMessage('Signing in…');

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: String(values.get('email')).trim(),
        password: String(values.get('password')),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
    renderHome(result.user);
  } catch (error) {
    showMessage(`Unable to sign in: ${error.message}`);
    button.disabled = false;
  }
}

async function signOut() {
  const button = document.querySelector('#sign-out');
  button.disabled = true;
  try {
    const response = await fetch('/api/logout', { method: 'POST' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to sign out.');
    renderSignIn();
  } catch (error) {
    button.disabled = false;
    document.querySelector('#home-message').textContent = `Unable to sign out: ${error.message}`;
  }
}

async function start() {
  try {
    const response = await fetch('/api/session');
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to check your session.');
    if (result.user) {
      renderHome(result.user);
      return;
    }
    renderSignIn();
  } catch (error) {
    renderSignIn(`Unable to connect to the login server: ${error.message}`);
  }
}

start().catch((error) => {
  renderSignIn(`Unable to initialize sign-in: ${error.message}`);
});
