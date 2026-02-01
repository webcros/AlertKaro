# AlertKaro 2.0 🚨

> **Report. Track. Resolve.**

AlertKaro is a modern web-based incident reporting and alert distribution platform designed to bridge the gap between citizens and emergency services. It empowers users to report incidents quickly and effectively while providing authorities with real-time data and tools to manage and resolve situations efficiently.

## 🚀 Features

### For Citizens
- **Instant Reporting**: Quickly report incidents with details and location.
- **Real-time Alerts**: Receive urgent safety alerts and notifications.
- **Incident History**: Track the status and history of your reported incidents.
- **Profile Management**: Secure user profiles to improved personalization and trust.
- **Dashboard**: A central hub for all user activities.

### For Authorities (Police & Admin)
- **Interactive Map View**: visualize incidents on a map for better strategic planning and response (powered by Leaflet).
- **Incident Management**: Review, track, and update the status of reported incidents.
- **Admin Dashboard**: Comprehensive tools for managing users, roles, and system settings.
- **Alert Generation**: specific tools to broadcast alerts to the public.

## 🛠️ Tech Stack

This project is built with a modern, scalable technology stack:

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: CSS Modules & Vanilla CSS
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Maps**: [Leaflet](https://leafletjs.com/)
- **State/Data**: React Hooks & Supabase client

## 📂 Project Structure

```bash
src/
├── app/
│   ├── admin/          # Administration dashboard and tools
│   ├── alerts/         # Public alerts page
│   ├── auth/           # Authentication logic
│   ├── dashboard/      # Main user dashboard
│   ├── incident/       # Incident tracking and details
│   ├── police/         # Police-specific views (Map, Reports)
│   ├── report/         # Incident reporting flow
│   ├── profile/        # User profile settings
│   ├── login/          # Login page
│   └── page.tsx        # Splash screen
└── ...
```

## 🏁 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Supabase project (for Database and Auth)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/alertkaro-2.0.git
   cd alertkaro-2.0
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
