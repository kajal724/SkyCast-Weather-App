from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

TIMEOUT = 15


def get_json(url, params):
    """API request aur errors ko ek jagah handle karo."""
    response = requests.get(url, params=params, timeout=TIMEOUT)
    response.raise_for_status()
    return response.json()


def find_city(city):
    data = get_json(
        GEOCODING_URL,
        {
            "name": city,
            "count": 1,
            "language": "en",
            "format": "json"
        }
    )

    results = data.get("results", [])
    if not results:
        raise ValueError("City nahi mili. Spelling check karo.")

    place = results[0]
    return {
        "name": place["name"],
        "latitude": place["latitude"],
        "longitude": place["longitude"],
        "country": place.get("country", ""),
        "admin1": place.get("admin1", "")
    }


def get_alerts(current, hourly, daily):
    """Forecast data se simple weather advisories banao."""
    alerts = []
    code = current.get("weather_code", 0) or 0

    rain_chance = max(
        hourly.get("precipitation_probability", [0])[:6] or [0]
    )
    wind = current.get("wind_speed_10m", 0) or 0
    uv = max(daily.get("uv_index_max", [0]) or [0])

    if code in (95, 96, 99):
        alerts.append({
            "level": "warning",
            "title": "Thunderstorm advisory",
            "message": "Forecast mein thunderstorm conditions hain."
        })

    if rain_chance >= 60:
        alerts.append({
            "level": "notice",
            "title": "Rain possibility",
            "message": f"Agale kuch ghanton mein rain probability {rain_chance}% tak hai."
        })

    if wind >= 40:
        alerts.append({
            "level": "warning",
            "title": "Strong wind advisory",
            "message": f"Forecast wind speed {wind} km/h hai."
        })

    if uv >= 8:
        alerts.append({
            "level": "notice",
            "title": "High UV index",
            "message": f"Aaj maximum UV index {uv} forecast hai."
        })

    if not alerts:
        alerts.append({
            "level": "good",
            "title": "No major advisory detected",
            "message": "Available forecast data se koi configured alert trigger nahi hua."
        })

    return alerts


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/weather")
def weather():
    try:
        city = request.args.get("city", "").strip()
        lat = request.args.get("lat", "").strip()
        lon = request.args.get("lon", "").strip()
        name = request.args.get("name", "").strip()

        if lat and lon:
            try:
                latitude = float(lat)
                longitude = float(lon)
            except ValueError:
                return jsonify({"error": "Invalid coordinates."}), 400

            if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
                return jsonify({"error": "Coordinates out of range."}), 400

            place = {
                "name": name or "Selected location",
                "latitude": latitude,
                "longitude": longitude,
                "country": "",
                "admin1": ""
            }
        elif city:
            place = find_city(city)
        else:
            return jsonify({
                "error": "City name ya location coordinates bhejo."
            }), 400

        lat = place["latitude"]
        lon = place["longitude"]

        forecast = get_json(
            WEATHER_URL,
            {
                "latitude": lat,
                "longitude": lon,
                "timezone": "auto",
                "forecast_days": 7,
                "current": (
                    "temperature_2m,relative_humidity_2m,"
                    "apparent_temperature,is_day,precipitation,"
                    "rain,showers,snowfall,weather_code,cloud_cover,"
                    "pressure_msl,wind_speed_10m,wind_direction_10m"
                ),
                "hourly": (
                    "temperature_2m,precipitation_probability,"
                    "weather_code,wind_speed_10m"
                ),
                "daily": (
                    "weather_code,temperature_2m_max,temperature_2m_min,"
                    "sunrise,sunset,uv_index_max,precipitation_probability_max"
                )
            }
        )

        air = {}
        air_error = None

        try:
            air = get_json(
                AIR_URL,
                {
                    "latitude": lat,
                    "longitude": lon,
                    "timezone": "auto",
                    "current": (
                        "us_aqi,european_aqi,pm2_5,pm10,"
                        "ozone,nitrogen_dioxide,sulphur_dioxide,"
                        "carbon_monoxide"
                    )
                }
            )
        except (requests.RequestException, ValueError):
            air_error = "Air-quality data abhi available nahi hai."

        current = forecast.get("current", {})
        hourly = forecast.get("hourly", {})
        daily = forecast.get("daily", {})
        air_current = air.get("current", {})

        times = hourly.get("time", [])
        current_time = current.get("time", "")
        start = next(
            (i for i, t in enumerate(times) if t >= current_time),
            0
        )

        # Current hour se agle 24 hourly records
        hourly_forecast = []
        for i in range(start, min(start + 24, len(times))):
            hourly_forecast.append({
                "time": times[i],
                "temperature": (hourly.get("temperature_2m") or [])[i],
                "rain_probability": (
                    hourly.get("precipitation_probability") or [0]
                )[i],
                "weather_code": (hourly.get("weather_code") or [0])[i],
                "wind_speed": (hourly.get("wind_speed_10m") or [0])[i]
            })

        days = []
        for i, day in enumerate(daily.get("time", [])):
            days.append({
                "date": day,
                "weather_code": daily["weather_code"][i],
                "max": daily["temperature_2m_max"][i],
                "min": daily["temperature_2m_min"][i],
                "sunrise": daily["sunrise"][i],
                "sunset": daily["sunset"][i],
                "uv_index": daily["uv_index_max"][i],
                "rain_probability": daily[
                    "precipitation_probability_max"
                ][i]
            })

        return jsonify({
            "location": place,
            "timezone": forecast.get("timezone", ""),
            "current": current,
            "hourly": hourly_forecast,
            "daily": days,
            "air_quality": air_current,
            "air_error": air_error,
            "alerts": get_alerts(current, hourly, daily)
        })

    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404
    except requests.RequestException:
        return jsonify({
            "error": "Weather service se connection nahi ho paaya. Internet check karke retry karo."
        }), 502
    except (KeyError, IndexError, TypeError):
        app.logger.exception("Unexpected API response")
        return jsonify({
            "error": "Weather data ka format unexpected hai. Thodi der baad retry karo."
        }), 502


if __name__ == "__main__":
    app.run(debug=True)
