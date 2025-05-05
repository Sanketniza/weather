// Configuration settings for the Weather Dashboard
const CONFIG = {
    // OpenWeatherMap API key - Replace with your own API key
    API_KEY: "5f472b7acba333cd8a035ea85a0d4d4c",
    
    // API endpoints
    WEATHER_API: {
        BASE_URL: "https://api.openweathermap.org/data/2.5",
        CURRENT_WEATHER: "/weather",
        FORECAST: "/forecast",
        ICON_URL: "https://openweathermap.org/img/wn/"
    },
    
    // Default settings
    DEFAULT_CITY: "London",
    UNITS: "imperial", // Options: metric, imperial
    
    // Local storage keys
    STORAGE_KEYS: {
        FAVORITES: "weatherDashboard_favorites",
        LAST_CITY: "weatherDashboard_lastCity",
        THEME: "weatherDashboard_theme"
    }
};
