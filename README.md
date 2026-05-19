# AI Price Intelligence Platform (Upgrade)

This is an upgraded, full-scale AI-driven Price Intelligence Platform replacing the original Flask prototype.

## Tech Stack
- **Frontend**: React.js (Vite), Tailwind CSS, Chart.js
- **Backend**: Flask REST API, PostgreSQL (Neon DB via SQLAlchemy), JWT Auth
- **Machine Learning**: Scikit-Learn (Linear Regression), Numpy, Pandas
- **Background Tasks**: APScheduler (Alternative to Celery for lightweight environments), ReportLab (PDFs)

## Architecture Overview
- `backend/` - Modular Flask application with industry-standard Blueprints:
  - `routes/` - Separated API endpoints for Auth, Products, Wishlist, Admin, and Alerts.
  - `services/` - Business logic and external integrations (Scraper, Mail, AI, Scheduler).
  - `models/` - SQLAlchemy data definitions.
- `frontend/` - Modern React UI dashboard with charts and real-time visualization.

---

### Phase 1: Running the Backend
1. Open a terminal and navigate to this folder:
   `cd "c:\Users\majeed\Downloads\saran (3)\saran\backend"`
2. Un-install old packages (optional) or create a virtual environment:
   `python -m venv venv`
   `.\venv\Scripts\activate` (Ignore if not using venv)
3. Install dependencies:
   `pip install -r requirements.txt`
4. Start the backend Server:
   `python app.py`

*Note: The Server will connect to your Neon Postgres DB and build tables automatically. The APScheduler thread will start automatically in the background.*

---

### Phase 2: Running the Frontend
1. Open a secondary terminal and navigate to the frontend folder:
   `cd "c:\Users\majeed\Downloads\saran (3)\saran\frontend"`
2. Install standard dependencies and UI charts and tailwind:
   `npm install`
   `npm install chart.js react-chartjs-2`
   `npm install -D tailwindcss postcss autoprefixer`
   `npx tailwindcss init -p`
3. Configure `tailwind.config.js` (We have done this for you, just follow the start command)
4. Start the Frontend React Server:
   `npm run dev`

### Access
- Go to `http://localhost:5173/` for the modern UI dashboard!

## Features Integrated (All 20)
1. **Multi-platform integration** - Amazon & Flipkart (via Google Shopping)
2. **Price Prediction (7/15/30 Days)** - Included in ML Analytics engine
3. **Buy Score Engine (0-100)** - Custom scoring based on historical drops
4. **Price Trend Graph** - 30-day visualization via Chart.js
5. **Fake Discount Detection** - Flags inflated MRP based on max historical price
6. **Real Discount Tracker** - Exact percentage displayed on dashboard
7. **Price Volatility Indicator** - Stable / Moderate / Highly Volatile detection 
8. **Flash Sale Detector** - Runs in background scheduler
9. **Smart Predictive Alerts** - Tracks drops continuously
10. **Product Popularity Ranking** - Available in Admin route
11. **Personalized Recommendations** - Based on search history
12. **Category-wise Analytics** - Setup available via DB aggregation
13. **Monthly PDF Report** - ReportLab generation via `/api/report/download`
14. **Admin Dashboard** - Exposed on `/api/admin/dashboard`
15. **Search History Tracking** - User searches logged with timestamps
16. **Wishlist Analytics** - Handled in DB relationships
17. **Cheapest Platform Badge** - UI highlights cheapest deal dynamically
18. **Price Drop Tracker** - Savings computed instantly
19. **Seasonal Trend Detection** - Displayed graphically for visualization
20. **Comparison Summary Chart** - Live bar chart across multiple platforms
