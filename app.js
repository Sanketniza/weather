// DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const favoriteBtn = document.getElementById('favorite-btn');
const errorContainer = document.getElementById('error-container');
const cityNameElement = document.getElementById('city-name');
const currentDateElement = document.getElementById('current-date');
const weatherIconElement = document.getElementById('weather-icon');
const temperatureElement = document.getElementById('temperature');
const feelsLikeElement = document.getElementById('feels-like');
const weatherDescriptionElement = document.getElementById('weather-description');
const humidityElement = document.getElementById('humidity');
const windSpeedElement = document.getElementById('wind-speed');
const pressureElement = document.getElementById('pressure');
const forecastElement = document.getElementById('forecast');
const favoritesListElement = document.getElementById('favorites-list');
const noFavoritesElement = document.getElementById('no-favorites');
const themeToggle = document.querySelector('.theme-toggle');

// Global variables
let currentCity = '';
let favorites = [];

// Initialize the application , also called main function or entry point
function initApp() {
    loadFavorites();
    loadTheme();
    
    // Event listeners
    searchBtn.addEventListener('click', handleSearch);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    locationBtn.addEventListener('click', getLocationWeather);
    favoriteBtn.addEventListener('click', toggleFavorite);
    themeToggle.addEventListener('click', toggleTheme);
    
    // Load last searched city or default city
    const lastCity = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_CITY);
    if (lastCity) {
        cityInput.value = lastCity;
        handleSearch();
    } else {
        cityInput.value = CONFIG.DEFAULT_CITY;
        handleSearch();
    }
}

// Handle search button click
function handleSearch() {
    const city = cityInput.value.trim();
    if (city) {
        currentCity = city;
        localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_CITY, city);
        getWeatherData(city);
        getForecastData(city);
        updateFavoriteButton();
    } else {
        showError('Please enter a city name');
    }
}

// Get weather data for a city
async function getWeatherData(city) {
    try {
        showLoading();
        clearError();
        
        const url = `${CONFIG.WEATHER_API.BASE_URL}${CONFIG.WEATHER_API.CURRENT_WEATHER}?q=${city}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(await handleApiError(response));
        }
        
        const data = await response.json();
        updateCurrentWeather(data);
        hideLoading();
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

// Get forecast data for a city
async function getForecastData(city) {
    try {
        const url = `${CONFIG.WEATHER_API.BASE_URL}${CONFIG.WEATHER_API.FORECAST}?q=${city}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(await handleApiError(response));
        }
        
        const data = await response.json();
        updateForecast(data);
    } catch (error) {
        showError(error.message);
    }
}

// Get weather for current location
function getLocationWeather() {
    if (navigator.geolocation) {
        showLoading();
        clearError();
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const url = `${CONFIG.WEATHER_API.BASE_URL}${CONFIG.WEATHER_API.CURRENT_WEATHER}?lat=${latitude}&lon=${longitude}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`;
                    const forecastUrl = `${CONFIG.WEATHER_API.BASE_URL}${CONFIG.WEATHER_API.FORECAST}?lat=${latitude}&lon=${longitude}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`;
                    
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(await handleApiError(response));
                    }
                    
                    const data = await response.json();
                    currentCity = data.name;
                    cityInput.value = currentCity;
                    localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_CITY, currentCity);
                    updateCurrentWeather(data);
                    
                    const forecastResponse = await fetch(forecastUrl);
                    if (!forecastResponse.ok) {
                        throw new Error(await handleApiError(forecastResponse));
                    }
                    
                    const forecastData = await forecastResponse.json();
                    updateForecast(forecastData);
                    updateFavoriteButton();
                    hideLoading();
                } catch (error) {
                    hideLoading();
                    showError(error.message);
                }
            },
            (error) => {
                hideLoading();
                let errorMessage = 'Unable to retrieve your location';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access was denied. Please enable location services.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'The request to get location timed out.';
                        break;
                }
                
                showError(errorMessage);
            }
        );
    } else {
        showError('Geolocation is not supported by your browser');
    }
}

// Update current weather display
function updateCurrentWeather(data) {
    const { name, main, weather, wind, sys } = data;
    
    // Update city name and date
    cityNameElement.textContent = `${name}, ${sys.country}`;
    currentDateElement.textContent = formatDate(new Date());
    
    // Update weather icon and temperature
    const iconCode = weather[0].icon;
    weatherIconElement.src = `${CONFIG.WEATHER_API.ICON_URL}${iconCode}@2x.png`;
    weatherIconElement.alt = weather[0].description;
    
    temperatureElement.textContent = `${Math.round(main.temp)}°${CONFIG.UNITS === 'metric' ? 'C' : 'F'}`;
    feelsLikeElement.textContent = `Feels like: ${Math.round(main.feels_like)}°${CONFIG.UNITS === 'metric' ? 'C' : 'F'}`;
    
    // Update weather details
    weatherDescriptionElement.textContent = capitalizeFirstLetter(weather[0].description);
    humidityElement.textContent = `${main.humidity}%`;
    windSpeedElement.textContent = `${wind.speed} ${CONFIG.UNITS === 'metric' ? 'm/s' : 'mph'}`;
    pressureElement.textContent = `${main.pressure} hPa`;
}

// Update forecast display
function updateForecast(data) {
    forecastElement.innerHTML = '';
    
    // Group forecast data by day (using date without time)
    const dailyForecasts = {}; // it's an object where keys are dates and values are objects with forecast data for that day
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toISOString().split('T')[0];
        
        // Skip today's forecast
        if (isToday(date)) return;
        
        if (!dailyForecasts[day]) {
            dailyForecasts[day] = {
                date,
                temps: [],
                icons: [],
                descriptions: [],
                humidity: [],
                wind: []
            };
        }
        
        dailyForecasts[day].temps.push(item.main.temp);
        dailyForecasts[day].icons.push(item.weather[0].icon);
        dailyForecasts[day].descriptions.push(item.weather[0].description);
        dailyForecasts[day].humidity.push(item.main.humidity);
        dailyForecasts[day].wind.push(item.wind.speed);
    });
    
    // Create a forecast card for each day (limit to 5 days)
    Object.values(dailyForecasts).slice(0, 5).forEach(forecast => {
        // Calculate average values
        const avgTemp = forecast.temps.reduce((sum, temp) => sum + temp, 0) / forecast.temps.length;
        const maxTemp = Math.max(...forecast.temps);
        const minTemp = Math.min(...forecast.temps);
        const avgHumidity = Math.round(forecast.humidity.reduce((sum, hum) => sum + hum, 0) / forecast.humidity.length);
        const avgWind = (forecast.wind.reduce((sum, wind) => sum + wind, 0) / forecast.wind.length).toFixed(1);
        
        // Get the most common icon and description
        const iconCounts = {};
        forecast.icons.forEach(icon => {
            iconCounts[icon] = (iconCounts[icon] || 0) + 1;
        });
        const mostCommonIcon = Object.entries(iconCounts).sort((a, b) => b[1] - a[1])[0][0];
        
        const descCounts = {};
        forecast.descriptions.forEach(desc => {
            descCounts[desc] = (descCounts[desc] || 0) + 1;
        });
        const mostCommonDesc = Object.entries(descCounts).sort((a, b) => b[1] - a[1])[0][0];
        
        // Create forecast card
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        forecastCard.innerHTML = `
            <h3>${formatDay(forecast.date)}</h3>
            <img src="${CONFIG.WEATHER_API.ICON_URL}${mostCommonIcon}@2x.png" alt="${mostCommonDesc}">
            <p class="temp">${Math.round(avgTemp)}°${CONFIG.UNITS === 'metric' ? 'C' : 'F'}</p>
            <p class="forecast-details">H: ${Math.round(maxTemp)}° L: ${Math.round(minTemp)}°</p>
            <p class="forecast-details">Humidity: ${avgHumidity}%</p>
            <p class="forecast-details">Wind: ${avgWind} ${CONFIG.UNITS === 'metric' ? 'm/s' : 'mph'}</p>
        `;
        
        forecastElement.appendChild(forecastCard);
    });
}

// Toggle favorite status for current city
function toggleFavorite() {
    if (!currentCity) return;
    
    const index = favorites.findIndex(city => city.toLowerCase() === currentCity.toLowerCase());
    
    if (index === -1) {
        // Add to favorites
        favorites.push(currentCity);
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
        favoriteBtn.classList.add('active');
    } else {
        // Remove from favorites
        favorites.splice(index, 1);
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        favoriteBtn.classList.remove('active');
    }
    
    saveFavorites();
    renderFavorites();
}

// Update favorite button based on current city
function updateFavoriteButton() {
    if (!currentCity) return;
    
    const isFavorite = favorites.some(city => city.toLowerCase() === currentCity.toLowerCase());
    
    if (isFavorite) {
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
        favoriteBtn.classList.add('active');
    } else {
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        favoriteBtn.classList.remove('active');
    }
}

// Load favorites from local storage
function loadFavorites() {
    const storedFavorites = localStorage.getItem(CONFIG.STORAGE_KEYS.FAVORITES);
    favorites = storedFavorites ? JSON.parse(storedFavorites) : [];
    renderFavorites();
}

// Save favorites to local storage
function saveFavorites() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
}

// Render favorites list
function renderFavorites() {
    favoritesListElement.innerHTML = '';
    
    if (favorites.length === 0) {
        noFavoritesElement.style.display = 'block';
        return;
    }
    
    noFavoritesElement.style.display = 'none';
    
    favorites.forEach(city => {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'favorite-item';
        favoriteItem.innerHTML = `
            <span>${city}</span>
            <button class="remove-favorite" aria-label="Remove ${city} from favorites">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add click event to load this city
        favoriteItem.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-favorite')) {
                cityInput.value = city;
                handleSearch();
            }
        });
        
        // Add click event to remove button
        const removeBtn = favoriteItem.querySelector('.remove-favorite');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = favorites.indexOf(city);
            if (index !== -1) {
                favorites.splice(index, 1);
                saveFavorites();
                renderFavorites();
                
                // Update favorite button if this was the current city
                if (city.toLowerCase() === currentCity.toLowerCase()) {
                    favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
                    favoriteBtn.classList.remove('active');
                }
            }
        });
        
        favoritesListElement.appendChild(favoriteItem);
    });
}

// Toggle theme between light and dark
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-theme');
    
    // Update theme icon
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    
    // Save theme preference
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
}

// Load theme from local storage
function loadTheme() {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Helper function to handle API errors
async function handleApiError(response) {
    if (response.status === 404) {
        return 'City not found. Please check the spelling and try again.';
    } else if (response.status === 401) {
        return 'Invalid API key. Please check your configuration.';
    } else if (response.status === 429) {
        return 'API rate limit exceeded. Please try again later.';
    } else {
        try {
            const errorData = await response.json();
            return errorData.message || 'An error occurred while fetching weather data.';
        } catch (e) {
            return `Error ${response.status}: An error occurred while fetching weather data.`;
        }
    }
}

// Helper function to show error message
function showError(message) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
}

// Helper function to clear error message
function clearError() {
    errorContainer.textContent = '';
    errorContainer.style.display = 'none';
}

// Helper function to show loading indicator
function showLoading() {
    searchBtn.innerHTML = '<span class="loading"></span>';
    searchBtn.disabled = true;
}

// Helper function to hide loading indicator
function hideLoading() {
    searchBtn.innerHTML = '<i class="fas fa-search"></i>';
    searchBtn.disabled = false;
}

// Helper function to format date
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Helper function to format day
function formatDay(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Helper function to check if a date is today
function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
