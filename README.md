# OptiWatt UI (Frontend)

![HTML](https://img.shields.io/badge/HTML-5-E34F26?logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=111)

OptiWatt is a frontend-only smart energy and home automation dashboard designed for electronics lab demos. It showcases room-level monitoring, device control, automation settings, and energy analytics without requiring a backend.

## Highlights
- Clean landing page with project overview and demo access
- Professional login and registration flows (local storage only)
- Dashboard with energy analytics, goals, notifications, and settings
- Rooms and devices management views
- Light/Dark mode toggle across pages

## Pages
- `index.html` — Landing page
- `login.html` — Login
- `register.html` — Registration
- `dashboard.html` — Main dashboard
- `rooms.html` — Rooms management
- `devices.html` — Devices management

## Demo Credentials
For the built-in admin demo:
- Username: `admin`
- Password: `admin`

## Tech Stack
- HTML5
- CSS3 (custom + Tailwind CDN)
- Vanilla JavaScript
- Chart.js (analytics)

## Run Locally (Windows)
This project is static HTML/CSS/JS, so no backend or build step is required.

### 1) Clone the repository
```powershell
git clone https://github.com/litch07/optiwatt-frontend.git
cd optiwatt-frontend
```

### 2) Open the app
Open `index.html` in your browser.

## Project Structure
```
OptiWatt-UI/
  index.html
  login.html
  register.html
  dashboard.html
  rooms.html
  devices.html
  styles.css
  script.js
  rooms.js
  pricing.js
  logo.png
```

## API Integration Suggestions
If you plan to add a backend later, here are clean integration points:
- **Auth**: Replace local storage logic with JWT or session-based auth.
- **Rooms & Devices**: Connect CRUD endpoints for rooms, appliances, and schedules.
- **Energy Analytics**: Stream or poll usage data with REST or WebSockets.
- **Notifications**: Push server events (e.g., MQTT, WebSockets, Firebase).
- **Settings**: Persist automation rules and energy rates server-side.

## Roadmap Ideas
- Role-based access (admin vs. user)
- Real-time device status via MQTT or WebSockets
- Device telemetry storage and reports
- Export to CSV/PDF server-side
- Multi-home support

## Credits
Designed and built by **Sadid Ahmed** for an electronics lab project UI showcase.

## License
MIT License. See `LICENSE`.
