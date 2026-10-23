# 🌦️ SkyCast - Weather Forecasting Web App

## 📌 About the Project

SkyCast is a weather forecasting web application developed using Python, Flask, HTML, CSS, and JavaScript. It provides weather information through a simple, responsive, and user-friendly dashboard.

Users can search for a city to view current weather conditions and forecasts.

## ✨ Features

- Search weather by city name
- Display current temperature and weather conditions
- Show humidity, wind speed, and atmospheric pressure
- Hourly weather forecast
- 7-day weather forecast
- Air Quality Index (AQI)
- Interactive weather map
- Current-location weather using browser location permission
- Weather advisories based on forecast conditions
- Responsive dashboard design

*Note: Keep only the features that are implemented and working in your application.*

## 🛠️ Technologies Used

- **Frontend:** HTML5, CSS3, JavaScript
- **Backend:** Python and Flask
- **Weather API:** Open-Meteo
- **Charts:** Chart.js
- **Maps:** Leaflet.js and OpenStreetMap

## 📁 Project Structure

```text
weather-forecasting/
├── app.py
├── requirements.txt
├── README.md
├── templates/
│   └── index.html
└── static/
    ├── css/
    │   └── style.css
    └── js/
        └── script.js
```

## 🚀 Installation and Setup

### Prerequisites

- Python installed on your computer
- Internet connection
- A code editor such as VS Code

### Step 1: Open the Project Folder

Open the terminal in the project directory.

### Step 2: Install Dependencies

```bash
python -m pip install -r requirements.txt
```

If you use the project's virtual environment on Windows, run:

```bash
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

### Step 3: Run the Application

```bash
.\venv\Scripts\python.exe app.py
```

### Step 4: Open the Application

Open your browser and visit:

http://127.0.0.1:5000

## 🌐 Data Source

SkyCast uses Open-Meteo services to retrieve weather forecasts, geocoding results, and air-quality information.

An internet connection is required to retrieve live data and load external resources such as maps and charts.

## 🎯 Project Objective

The objective of this project is to develop a practical weather forecasting application while learning web development, REST API integration, Python Flask, and responsive user interface design.

## 🔮 Future Improvements

- Weather forecast notifications
- Save favorite cities
- Weather history and comparisons
- Deployment on a public hosting platform

## 👩‍💻 Author

**Name:** Kajal Chourey

**Course:** B.Tech – Computer Science and Engineering

## 📄 License

This project is developed for educational and portfolio purposes. Please follow the terms of the APIs and external services used in the application.
