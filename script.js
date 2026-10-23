
let temperatureChart = null;
let weatherMap = null;
let locationMarker = null;

const $ = (id) => document.getElementById(id);

function weatherInfo(code, isDay = 1) {
  const map = {
    0: ["Clear sky", isDay ? "☀️" : "🌙"],
    1: ["Mainly clear", isDay ? "🌤️" : "🌙"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"],
    48: ["Rime fog", "🌫️"],
    51: ["Light drizzle", "🌦️"],
    53: ["Drizzle", "🌦️"],
    55: ["Heavy drizzle", "🌧️"],
    61: ["Light rain", "🌦️"],
    63: ["Rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    71: ["Light snow", "🌨️"],
    73: ["Snow", "🌨️"],
    75: ["Heavy snow", "❄️"],
    80: ["Rain showers", "🌦️"],
    81: ["Rain showers", "🌧️"],
    82: ["Heavy showers", "⛈️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with hail", "⛈️"],
    99: ["Severe thunderstorm with hail", "⛈️"]
  };

  return map[code] || ["Weather conditions", "🌡️"];
}

function showStatus(message, isError = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", isError);
}

function formatTime(value) {
  if (!value) return "--:--";
  return value.slice(11, 16);
}

function formatDay(value, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";

  return new Date(value + "T12:00:00").toLocaleDateString("en-IN", {
    weekday: "short"
  });
}

async function loadWeather(query = "city=Indore") {
  showStatus("Fetching weather data...");
  $("updated").textContent = "Updating dashboard...";

  try {
    const response = await fetch(`/api/weather?${query}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Weather data could not be loaded.");
    }

    renderDashboard(data);
    showStatus("Weather data loaded successfully.");
    $("updated").textContent =
      "Updated at " + new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
  } catch (error) {
    showStatus(error.message || "Something went wrong.", true);
    $("updated").textContent = "Update failed";
  }
}

function renderDashboard(data) {
  const current = data.current;
  const location = data.location;
  const today = data.daily[0];
  const condition = weatherInfo(
    current.weather_code,
    current.is_day
  );

  $("cityName").textContent = location.name;
  $("countryName").textContent =
    [location.admin1, location.country].filter(Boolean).join(", ") ||
    `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`;

  $("temperature").textContent = Math.round(current.temperature_2m);
  $("condition").textContent = condition[0];
  $("weatherIcon").textContent = condition[1];
  $("feelsLike").textContent =
    `${Math.round(current.apparent_temperature)}°C`;

  $("currentDate").textContent = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  $("humidity").textContent =
    `${current.relative_humidity_2m}%`;
  $("wind").textContent =
    `${Math.round(current.wind_speed_10m)} km/h`;
  $("pressure").textContent =
    `${Math.round(current.pressure_msl)} hPa`;
  $("uv").textContent = today ? today.uv_index : "--";
  $("sunrise").textContent = today ? formatTime(today.sunrise) : "--:--";
  $("sunset").textContent = today ? formatTime(today.sunset) : "--:--";

  const nextHours = data.hourly.slice(0, 6);
  const rain = nextHours.length
    ? Math.max(...nextHours.map(h => h.rain_probability ?? 0))
    : 0;

  $("rainChance").textContent = `${rain}%`;

  renderHourly(data.hourly);
  renderDaily(data.daily);
  renderAirQuality(data.air_quality, data.air_error);
  renderAlerts(data.alerts);
  updateMap(location);
}

function renderHourly(hours) {
  const visible = hours.slice(0, 12);

  $("hourlyList").innerHTML = visible.map((hour, index) => {
    const info = weatherInfo(hour.weather_code);
    const time = index === 0 ? "Now" : formatTime(hour.time);

    return `
      <div class="hour-card">
        <small>${time}</small>
        <span>${info[1]}</span>
        <strong>${Math.round(hour.temperature)}°C</strong>
        <div class="rain">☂ ${hour.rain_probability ?? 0}%</div>
      </div>`;
  }).join("");

  const ctx = $("hourlyChart").getContext("2d");

  if (temperatureChart) {
    temperatureChart.destroy();
  }

  temperatureChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: visible.map((hour, index) =>
        index === 0 ? "Now" : formatTime(hour.time)
      ),
      datasets: [{
        label: "Temperature (°C)",
        data: visible.map(hour => hour.temperature),
        borderColor: "#9a8cff",
        backgroundColor: "rgba(154,140,255,.13)",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#a1acc6", maxTicksLimit: 8 }
        },
        y: {
          grid: { color: "rgba(150,160,190,.12)" },
          ticks: {
            color: "#a1acc6",
            callback: value => `${value}°`
          }
        }
      }
    }
  });
}

function renderDaily(days) {
  $("dailyForecast").innerHTML = days.map((day, index) => {
    const info = weatherInfo(day.weather_code);

    return `
      <div class="day-row">
        <div class="day-name">${formatDay(day.date, index)}</div>
        <div class="day-icon">${info[1]}</div>
        <div class="day-condition">${info[0]}</div>
        <div class="day-temps">
          <strong>${Math.round(day.max)}°</strong>
          <span>${Math.round(day.min)}°</span>
        </div>
      </div>`;
  }).join("");
}

function aqiCategory(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return ["Unavailable", "AQI --"];
  }

  const aqi = Number(value);

  if (aqi <= 50) return ["Good", `AQI ${aqi}`];
  if (aqi <= 100) return ["Moderate", `AQI ${aqi}`];
  if (aqi <= 150) return ["Unhealthy for sensitive groups", `AQI ${aqi}`];
  if (aqi <= 200) return ["Unhealthy", `AQI ${aqi}`];
  if (aqi <= 300) return ["Very unhealthy", `AQI ${aqi}`];

  return ["Hazardous", `AQI ${aqi}`];
}

function renderAirQuality(air, error) {
  if (!air || air.us_aqi == null) {
    $("aqiBadge").textContent = "AQI unavailable";
    $("aqiContent").innerHTML =
      `<p class="muted">${error || "AQI data is not available for this location."}</p>`;
    return;
  }

  const [category, badge] = aqiCategory(air.us_aqi);
  const score = Math.max(0, Math.min(100, Number(air.us_aqi) / 3.01));

  $("aqiBadge").textContent = badge;

  $("aqiContent").innerHTML = `
    <div class="aqi-score">
      <div class="aqi-number">${Math.round(air.us_aqi)}</div>
      <div class="aqi-label">${category}</div>
      <div class="aqi-meter">
        <span class="aqi-marker" style="left:${score}%"></span>
      </div>
      <p class="fine-print">US AQI scale</p>
    </div>
    <div class="pollutants">
      <div class="pollutant"><small>PM2.5</small><strong>${formatPollutant(air.pm2_5)} µg/m³</strong></div>
      <div class="pollutant"><small>PM10</small><strong>${formatPollutant(air.pm10)} µg/m³</strong></div>
      <div class="pollutant"><small>Ozone</small><strong>${formatPollutant(air.ozone)} µg/m³</strong></div>
      <div class="pollutant"><small>NO₂</small><strong>${formatPollutant(air.nitrogen_dioxide)} µg/m³</strong></div>
    </div>`;
}

function formatPollutant(value) {
  return value == null || !Number.isFinite(Number(value))
    ? "--"
    : Number(value).toFixed(1);
}

function renderAlerts(alerts) {
  const icons = {
    warning: "⚠️",
    notice: "ℹ️",
    good: "✓"
  };

  $("alertsList").innerHTML = (alerts || []).map(alert => `
    <article class="alert-card ${alert.level}">
      <span class="alert-symbol">${icons[alert.level] || "ℹ️"}</span>
      <div>
        <strong>${alert.title}</strong>
        <p>${alert.message}</p>
      </div>
    </article>
  `).join("");
}

function updateMap(location) {
  const lat = Number(location.latitude);
  const lon = Number(location.longitude);

  $("mapCoordinates").textContent =
    `${lat.toFixed(3)}, ${lon.toFixed(3)}`;

  if (!weatherMap) {
    weatherMap = L.map("weatherMap").setView([lat, lon], 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(weatherMap);
  } else {
    weatherMap.setView([lat, lon], 10);
  }

  if (locationMarker) {
    locationMarker.setLatLng([lat, lon]);
  } else {
    locationMarker = L.marker([lat, lon]).addTo(weatherMap);
  }

  locationMarker.bindPopup(location.name).openPopup();

  setTimeout(() => weatherMap.invalidateSize(), 100);
}

$("searchForm").addEventListener("submit", event => {
  event.preventDefault();

  const city = $("cityInput").value.trim();
  if (!city) return;

  loadWeather(`city=${encodeURIComponent(city)}`);
});

$("locationBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    showStatus("This browser does not support location services.", true);
    return;
  }

  showStatus("Requesting your location permission...");

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      loadWeather(
        `lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&name=${encodeURIComponent("My location")}`
      );
    },
    error => {
      const message = error.code === 1
        ? "Location permission denied. Allow it in your browser settings."
        : "Location unavailable. Search for a city instead.";

      showStatus(message, true);
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
});

$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  const light = document.body.classList.contains("light");
  document.body.style.colorScheme = light ? "light" : "dark";
});

// Initial dashboard
loadWeather("city=Indore");
