// Dayline configuration.
// Paste the IDs from the setup guide here so every device picks them up automatically
// (you can also enter them in the app under Settings → Calendars).
// These are public identifiers, not passwords — it's safe for them to live in a public repository.
window.DAYLINE_CONFIG = {
  // Google Cloud → Google Auth Platform → Clients → your Web client, e.g. "1234567890-abc123.apps.googleusercontent.com"
  googleClientId: '',

  // Microsoft Entra → App registrations → Dayline → "Application (client) ID"
  microsoftClientId: '',

  // Microsoft Entra → App registrations → Dayline → "Directory (tenant) ID" (or your organization's domain, e.g. "yourcompany.com")
  microsoftTenant: '',
};
