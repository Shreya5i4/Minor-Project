// DOM Elements
const imageInput = document.getElementById('imageInput');
const uploadBox = document.querySelector('.upload-box');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultsSection = document.getElementById('resultsSection');
const errorMessage = document.getElementById('errorMessage');
const previewImage = document.getElementById('previewImage');
const newRecipeBtn = document.getElementById('newRecipeBtn');
const printBtn = document.getElementById('printBtn');

// Track currently selected File for upload and recipe data
let selectedFile = null;
let allRecipes = [];
let currentRecipeIndex = 0;
let recipeDatabase = {};

// Load recipes from backend on page load
async function loadRecipeDatabase() {
    try {
        const response = await fetch('/static/main/indian_recipes.json');
        recipeDatabase = await response.json();
    } catch (err) {
        console.error('Failed to load recipe database:', err);
    }
}

// Event Listeners
imageInput.addEventListener('change', handleFileSelect);
uploadBox.addEventListener('dragover', handleDragOver);
uploadBox.addEventListener('dragleave', handleDragLeave);
uploadBox.addEventListener('drop', handleDrop);
newRecipeBtn.addEventListener('click', resetForm);
printBtn.addEventListener('click', printRecipe);

// Drag and Drop Handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        imageInput.files = files;
        handleFileSelect({ target: { files } });
    }
}

// File Selection Handler
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length === 0) return;

    const file = files[0];
    selectedFile = file;

    // Validate file
    if (!file.type.startsWith('image/')) {
        showError('Please upload an image file.');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB.');
        return;
    }

    // Read and display image
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        previewImage.src = imageData;
        
        // Check image quality
        checkImageQuality(previewImage, function(isBlurry) {
            if (isBlurry) {
                showError('❌ Image is too blurry! Cannot recognize food. Please upload a clearer picture.');
                loadingSpinner.classList.add('hidden');
                resultsSection.classList.add('hidden');
            } else {
                hideError();
                // Only recognize if image is clear
                recognizeFood(file);
            }
        });
    };
    reader.readAsDataURL(file);
}

// Recognize food by uploading to Django backend
function recognizeFood(file) {
    hideError();
    loadingSpinner.classList.remove('hidden');
    resultsSection.classList.add('hidden');

    if (!file) {
        showError('No file selected for recognition.');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    // Get CSRF token from cookies
    const csrftoken = getCookie('csrftoken');
    
    fetch('/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': csrftoken,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(res => {
        console.log('Response status:', res.status);
        return res.json().catch(err => {
            console.error('Failed to parse JSON:', err);
            throw new Error('Invalid response from server');
        });
    })
    .then(data => {
        console.log('Response data:', data);
        if (data.success && data.recipes && data.recipes.length > 0) {
            // Store all recipes
            allRecipes = data.recipes;
            currentRecipeIndex = 0;
            
            // Display all recipes with tabs
            displayAllRecipes();
        } else {
            const errorMsg = data.error || 'No recipe found. Please try another image.';
            showError(errorMsg);
            loadingSpinner.classList.add('hidden');
        }
    })
    .catch(err => {
        console.error('Recognition request failed:', err);
        showError('Error processing image. Please try again.');
        loadingSpinner.classList.add('hidden');
    });
}

// Display all recipes with tabs
function displayAllRecipes() {
    // Create tabs
    const tabsContainer = document.getElementById('recipeTabs');
    tabsContainer.innerHTML = '';
    
    allRecipes.forEach((recipe, index) => {
        const recipeName = recipe[0] || `Recipe ${index + 1}`;
        const tab = document.createElement('button');
        tab.className = `recipe-tab ${index === 0 ? 'active' : ''}`;
        tab.textContent = recipeName;
        tab.onclick = () => switchRecipe(index);
        tabsContainer.appendChild(tab);
    });
    
    // Display first recipe
    displayRecipeFromBackend(allRecipes[0]);
}

// Switch to a different recipe by index
function switchRecipe(index) {
    currentRecipeIndex = index;
    
    // Update tabs
    const tabs = document.querySelectorAll('.recipe-tab');
    tabs.forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    
    // Display the selected recipe
    displayRecipeFromBackend(allRecipes[index]);
}

// Display Recipe from Backend Data
function displayRecipeFromBackend(recipeData) {
    // recipeData format: [name, calories, cooking_time, ingredients, directions]
    const name = recipeData[0] || 'Unknown';
    const calories = recipeData[1] || 'N/A';
    const cookTime = recipeData[2] || 'N/A';
    const ingredients = recipeData[3] || [];
    const directions = recipeData[4] || [];

    // Populate recipe info
    document.getElementById('recipeTitle').textContent = name;
    document.getElementById('prepTime').textContent = 'N/A';
    document.getElementById('cookTime').textContent = cookTime;
    document.getElementById('calories').textContent = calories;
    document.getElementById('servings').textContent = 'Varies';
    document.getElementById('difficulty').textContent = 'Medium';
    document.getElementById('recognizedFood').textContent = name;
    document.getElementById('confidence').textContent = 'Confidence: Detected';

    // Populate ingredients (convert string or array)
    const ingredientsList = document.getElementById('ingredientsList');
    let ingredientsArray = [];
    
    if (typeof ingredients === 'string') {
        ingredientsArray = ingredients.split(',').map(ing => ing.trim());
    } else if (Array.isArray(ingredients)) {
        ingredientsArray = ingredients;
    }
    
    if (ingredientsArray.length > 0) {
        ingredientsList.innerHTML = ingredientsArray
            .map(ing => `<li>${ing}</li>`)
            .join('');
    }

    // Populate instructions (convert string or array)
    const instructionsList = document.getElementById('instructionsList');
    let directionsArray = [];
    
    if (typeof directions === 'string') {
        directionsArray = directions.split('.').filter(s => s.trim()).map(d => d.trim());
    } else if (Array.isArray(directions)) {
        directionsArray = directions;
    }
    
    if (directionsArray.length > 0) {
        instructionsList.innerHTML = directionsArray
            .map(inst => `<li>${inst}</li>`)
            .join('');
    }

    // Populate tips (generic tips)
    const tipsList = document.getElementById('tipsList');
    const tips = [
        'Use fresh, high-quality ingredients',
        'Follow the recipe instructions carefully',
        'Taste and adjust seasonings as needed',
        'Enjoy your meal!'
    ];
    tipsList.innerHTML = tips
        .map(tip => `<li>${tip}</li>`)
        .join('');

    // Show results
    loadingSpinner.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    scrollToResults();
}

// Utility Functions
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    loadingSpinner.classList.add('hidden');
    resultsSection.classList.add('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function resetForm() {
    imageInput.value = '';
    previewImage.src = '';
    resultsSection.classList.add('hidden');
    loadingSpinner.classList.add('hidden');
    hideError();
}

function printRecipe() {
    window.print();
}

// Smooth scroll to results
function scrollToResults() {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Get CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Detect blur in image using Laplacian variance method
function checkImageQuality(imgElement, callback) {
    imgElement.onload = function() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = imgElement.width;
            canvas.height = imgElement.height;
            
            // Draw image on canvas
            ctx.drawImage(imgElement, 0, 0);
            
            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Convert to grayscale and apply Laplacian filter
            const gray = new Uint8Array(canvas.width * canvas.height);
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
            }
            
            // Apply Laplacian filter
            const laplacian = new Array(canvas.width * canvas.height);
            const kernel = [
                [0, -1, 0],
                [-1, 4, -1],
                [0, -1, 0]
            ];
            
            let sum = 0;
            let count = 0;
            
            for (let y = 1; y < canvas.height - 1; y++) {
                for (let x = 1; x < canvas.width - 1; x++) {
                    let val = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = (y + ky) * canvas.width + (x + kx);
                            val += kernel[ky + 1][kx + 1] * gray[idx];
                        }
                    }
                    laplacian[y * canvas.width + x] = val;
                }
            }
            
            // Calculate variance of Laplacian
            const mean = laplacian.reduce((a, b) => a + b, 0) / laplacian.length;
            const variance = laplacian.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / laplacian.length;
            
            // Blur threshold (empirically determined)
            const BLUR_THRESHOLD = 100;
            const isBlurry = variance < BLUR_THRESHOLD;
            
            console.log('Image quality check - Laplacian variance:', variance, 'Blurry:', isBlurry);
            callback(isBlurry);
        } catch (err) {
            console.error('Error checking image quality:', err);
            // If error occurs, allow the image (don't block)
            callback(false);
        }
    };
}

// Load recipe database on page load
loadRecipeDatabase();
