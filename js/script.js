'use strict';

// Default timer settings
const DEFAULT_TIME = 1200; // 20 min
const DEFAULT_BREAK_TIME = 20; // 20 sec
const STROKE_DASH_OFFSET = 1207;

// Application state
const state = {
  countdown: '',
  screenTime: DEFAULT_TIME,
  breakTime: DEFAULT_BREAK_TIME,
  currentTime: DEFAULT_TIME,
  isScreenTime: true,
  sound: 'sound-1',
  darkMode: true,
  themeColor: '#10B981',
  animations: true,
  notificationPrefs: {
    sound: true,
    vibration: true,
    desktop: true,
    mobile: true
  }
};

// DOM Elements
const timerElement = document.querySelector('.timer__time-left');
const settingsElement = document.querySelector('.settings');
const stopBtn = document.querySelector('#stop');
const playBtn = document.querySelector('#play');
const pauseBtn = document.querySelector('#pause');
const settingsBtn = document.querySelector('#settings');
const saveBtn = document.querySelector('#save');
const closeBtn = document.querySelector('#close');
const minInput = document.querySelector('#min-input');
const secInput = document.querySelector('#sec-input');
const minSpan = document.querySelector('#min-span');
const secSpan = document.querySelector('#sec-span');
const circleElement = document.querySelector('.circle');
const soundDropdown = document.querySelector('.settings__sound-drop');
const sounds = document.querySelectorAll('audio');
const installPrompt = document.querySelector('.install-prompt');
const installBtn = document.querySelector('#install-btn');
const dismissBtn = document.querySelector('#dismiss-btn');
const darkModeToggle = document.querySelector('.dark-mode-toggle');
const timerContainer = document.querySelector('.timer');
const infoContainer = document.querySelector('.info');

// Color variables
const screenColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-screen')
  .trim();
const screenColorDark = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-screen-dark')
  .trim();
const screenColorLight = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-screen-light')
  .trim();
const breakColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-break')
  .trim();
const breakColorDark = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-break-dark')
  .trim();
const breakColorLight = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-break-light')
  .trim();
const defaultTitle = document.title;

//// FUNCTIONS ////

// Main timer function
const timer = function (seconds) {
  clearInterval(state.countdown);
  const now = Date.now();
  const total = now + seconds * 1000;
  displayTimeLeft(seconds);
  state.isScreenTime ? setTitle('Work') : setTitle('Look away');
  
  // Add animation class to timer if element exists
  if (timerContainer) {
    timerContainer.classList.add('timer-active');
  }
  
  state.countdown = setInterval(() => {
    const secondsLeft = Math.round((total - Date.now()) / 1000);
    if (secondsLeft < 0) {
      clearInterval(state.countdown);
      // Alternate between screen time and break time
      state.isScreenTime = !state.isScreenTime;
      if (state.isScreenTime) {
        timer(state.screenTime);
        changeColors(screenColor, screenColorDark, screenColorLight);
        document.body.classList.remove('break-mode');
        document.body.classList.add('work-mode');
      } else {
        timer(state.breakTime);
        changeColors(breakColor, breakColorDark, breakColorLight);
        document.body.classList.remove('work-mode');
        document.body.classList.add('break-mode');
      }
      // Reset circle
      const progressIndicator = document.querySelector('.progress-indicator');
      if (progressIndicator) {
        progressIndicator.style.strokeDashoffset = STROKE_DASH_OFFSET;
      }
      // Play sound
      const soundElement = document.getElementById(`${state.sound}`);
      if (soundElement) {
        soundElement.play();
      }
      
      // Show notification if permission granted
      showNotification();
      
      return;
    }
    displayTimeLeft(secondsLeft);
    state.currentTime = secondsLeft;
    // Animate the circle
    state.isScreenTime
      ? calculateStroke(state.screenTime)
      : calculateStroke(state.breakTime);
  }, 1000);
};

// Display time left in the timer
const displayTimeLeft = function (seconds) {
  const min = Math.floor(seconds / 60);
  const remainderSeconds = seconds % 60;
  const display = `${min < 10 ? '0' : ''}${min}:${remainderSeconds < 10 ? '0' : ''}${remainderSeconds}`;
  
  if (timerElement) {
    timerElement.textContent = display;
  }
  
  // Update progress for accessibility
  const progress = state.isScreenTime 
    ? (1 - seconds / state.screenTime) * 100 
    : (1 - seconds / state.breakTime) * 100;
  
  document.documentElement.style.setProperty('--progress', `${progress}%`);
};

// Start the timer
const startTimer = function () {
  // Initialize audio context on first user interaction
  initAudioContext().catch(console.error);
  togglePlayPause();
  timer(state.currentTime);
  
  // Add animation class if element exists
  if (timerContainer) {
    timerContainer.classList.add('timer-active');
  }
};

// Stop the timer
const stopTimer = function () {
  state.currentTime = state.screenTime;
  clearInterval(state.countdown);
  displayTimeLeft(state.screenTime);
  state.isScreenTime = true;
  
  const progressIndicator = document.querySelector('.progress-indicator');
  if (progressIndicator) {
    progressIndicator.style.strokeDashoffset = STROKE_DASH_OFFSET;
  }
  
  changeColors(screenColor, screenColorDark, screenColorLight);
  document.title = defaultTitle;
  
  if (playBtn && pauseBtn) {
    playBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
  }
  
  // Remove animation classes
  if (timerContainer) {
    timerContainer.classList.remove('timer-active');
  }
  document.body.classList.remove('break-mode');
  document.body.classList.add('work-mode');
};

// Pause the timer
const pauseTimer = function () {
  clearInterval(state.countdown);
  togglePlayPause();
  
  // Add paused class if element exists
  if (timerContainer) {
    timerContainer.classList.add('timer-paused');
  }
};

// Toggle play/pause buttons
const togglePlayPause = function () {
  if (playBtn && pauseBtn) {
    playBtn.classList.toggle('hidden');
    pauseBtn.classList.toggle('hidden');
    
    // Remove paused class if playing
    if (playBtn.classList.contains('hidden') && timerContainer) {
      timerContainer.classList.remove('timer-paused');
    }
  }
};

// Handle input from settings
const handleInput = function () {
  const { value: min } = minInput || { value: DEFAULT_TIME / 60 };
  const { value: sec } = secInput || { value: DEFAULT_BREAK_TIME };
  state.screenTime = +min * 60;
  state.breakTime = +sec;
  stopTimer();
  
  if (soundDropdown) {
    state.sound = soundDropdown.value;
  }
  
  if (settingsElement) {
    settingsElement.classList.toggle('hidden');
  }
  
  // Save settings to localStorage
  saveSettings();
};

// Calculate stroke offset for timer animation
const calculateStroke = function (time) {
  const progressIndicator = document.querySelector('.progress-indicator');
  if (progressIndicator) {
    const totalTime = state.isScreenTime ? state.screenTime : state.breakTime;
    const timeLeft = state.currentTime;
    const progress = 1 - (timeLeft / totalTime);
    const dashOffset = STROKE_DASH_OFFSET * (1 - progress);
    progressIndicator.style.strokeDashoffset = dashOffset;
  }
};

// Change colors based on mode (work/break)
const changeColors = function (main, dark, light) {
  document.documentElement.style.setProperty('--color-main', main);
  document.documentElement.style.setProperty('--color-main-dark', dark);
  document.documentElement.style.setProperty('--color-main-light', light);
};

// Preview sound when selected in dropdown
const previewSound = async function (e) {
  const soundID = e.target.value;
  
  // Update audio buffer for new selection
  try {
    const response = await fetch(`https://assets.mixkit.co/active_storage/sfx/${soundID}/${soundID}-preview.mp3`);
    alarmBuffer = await audioContext.decodeAudioData(await response.arrayBuffer());
    
    // Play preview
    const source = audioContext.createBufferSource();
    source.buffer = alarmBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch (error) {
    console.error('Error loading sound:', error);
    showSnackbar('Failed to load sound preview');
  }
};

// Set document title based on current mode
const setTitle = function (mode) {
  document.title = `${mode} ${mode === 'Work' ? '💻' : '👀'} ${defaultTitle}`;
};

// Toggle dark/light mode
const toggleDarkMode = function() {
  state.darkMode = !state.darkMode;
  document.body.classList.toggle('light-mode', !state.darkMode);
  document.body.classList.toggle('dark-mode', state.darkMode);
  
  // Update localStorage
  localStorage.setItem('darkMode', state.darkMode);
  
  // Update icon
  updateDarkModeIcon();
};

// Update dark mode toggle icon
const updateDarkModeIcon = function() {
  if (darkModeToggle) {
    darkModeToggle.innerHTML = state.darkMode 
      ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"></path></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"></path></svg>';
  }
};

// Save settings to localStorage
const saveSettings = function() {
  localStorage.setItem('screenTime', state.screenTime);
  localStorage.setItem('breakTime', state.breakTime);
  localStorage.setItem('sound', state.sound);
  localStorage.setItem('themeColor', state.themeColor);
  localStorage.setItem('animations', state.animations);
  localStorage.setItem('notificationPrefs', JSON.stringify(state.notificationPrefs));
};

// Load settings from localStorage
const loadSettings = function() {
  if (localStorage.getItem('screenTime')) {
    state.screenTime = parseInt(localStorage.getItem('screenTime'));
    state.currentTime = state.screenTime;
    if (minInput && minSpan) {
      minInput.value = state.screenTime / 60;
      minSpan.textContent = state.screenTime / 60;
    }
  }
  
  if (localStorage.getItem('breakTime')) {
    state.breakTime = parseInt(localStorage.getItem('breakTime'));
    if (secInput && secSpan) {
      secInput.value = state.breakTime;
      secSpan.textContent = state.breakTime;
    }
  }
  
  if (localStorage.getItem('sound')) {
    state.sound = localStorage.getItem('sound');
    if (soundDropdown) {
      soundDropdown.value = state.sound;
    }
  }
  
  if (localStorage.getItem('darkMode') !== null) {
    state.darkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('light-mode', !state.darkMode);
    document.body.classList.toggle('dark-mode', state.darkMode);
    updateDarkModeIcon();
  }
  
  if (localStorage.getItem('themeColor')) {
    state.themeColor = localStorage.getItem('themeColor');
    document.documentElement.style.setProperty('--color-accent', state.themeColor);
  }
  
  if (localStorage.getItem('animations') !== null) {
    state.animations = localStorage.getItem('animations') === 'true';
    document.body.classList.toggle('no-animations', !state.animations);
  }
  
  if (localStorage.getItem('notificationPrefs')) {
    state.notificationPrefs = JSON.parse(localStorage.getItem('notificationPrefs'));
  }
};

// Show notification
// Audio context for background playback
let audioContext = null;
let alarmBuffer = null;

// Initialize audio context on user interaction
const initAudioContext = async () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // Preload alarm sound
    const response = await fetch('https://assets.mixkit.co/active_storage/sfx/2995/2995-preview.mp3');
    alarmBuffer = await audioContext.decodeAudioData(await response.arrayBuffer());
  }
};

// Play sound with Web Audio API
const playAlarm = async () => {
  if (!audioContext) await initAudioContext();
  
  // Resume context if suspended (required for background tabs)
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  
  const source = audioContext.createBufferSource();
  source.buffer = alarmBuffer;
  source.connect(audioContext.destination);
  source.start(0);
  
  // Show visual notification if audio fails
  source.onended = () => showSnackbar('🔔 Time to take a break!');
};

const showNotification = function() {
  // Play sound using Web Audio API
  playAlarm().catch(error => {
    console.error('Audio playback failed:', error);
    showSnackbar('🔔 Time to take a break!');
  });

  if (('Notification' in window && Notification.permission === 'granted') && 
      (state.notificationPrefs.desktop || state.notificationPrefs.mobile)) {
    
    const notificationOptions = {
      body: state.isScreenTime 
        ? 'Focus on your work for the next 20 minutes.' 
        : 'Look at something 20 feet away for 20 seconds.',
      icon: 'img/icon-512.png',
      badge: 'img/favicon.ico',
      data: { timestamp: Date.now() },
      actions: [
        {
          action: 'snooze',
          title: '⏸️ Snooze 5min',
        },
        {
          action: 'dismiss',
          title: '❌ Dismiss',
        }
      ]
    };

    if (state.notificationPrefs.vibration && 'vibrate' in navigator) {
      notificationOptions.vibrate = [200, 100, 200];
    }

    const notification = new Notification(
      state.isScreenTime ? 'Time to work!' : 'Time to look away!', 
      notificationOptions
    );

    notification.onclick = (event) => {
      event.preventDefault();
      if (event.action === 'snooze') {
        pauseTimer();
        state.currentTime = 300;
        startTimer();
      }
      notification.close();
    };

    setTimeout(() => notification.close(), 30000);
  }
};

// Request notification permission
const requestNotificationPermission = function() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notification permission granted');
      }
    });
  }
};

// Register service worker for PWA functionality
const registerServiceWorker = function() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }, err => {
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }
};

// PWA install functionality
let deferredPrompt;

const handleInstall = function() {
  // Hide the install prompt
  if (installPrompt) {
    installPrompt.style.display = 'none';
  }
  
  // Show the install prompt
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      deferredPrompt = null;
    });
  }
};

const dismissInstall = function() {
  if (installPrompt) {
    installPrompt.style.display = 'none';
  }
};

////    EVENT LISTENERS    ////

// Initialize app on load
window.addEventListener('load', () => {
  displayTimeLeft(state.screenTime);
  loadSettings();
  requestNotificationPermission();
  registerServiceWorker();
});

// PWA install events
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installPrompt) {
    installPrompt.style.display = 'block';
  }
});

// Button event listeners
if (playBtn) playBtn.addEventListener('click', startTimer);
if (stopBtn) stopBtn.addEventListener('click', stopTimer);
if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    if (settingsElement) {
      settingsElement.classList.toggle('hidden');
    }
  });
}
if (saveBtn) saveBtn.addEventListener('click', handleInput);
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    if (settingsElement) {
      settingsElement.classList.toggle('hidden');
    }
  });
}

// Input event listeners
if (minInput && minSpan) {
  minInput.addEventListener('input', () => {
    minSpan.textContent = minInput.value;
  });
}
if (secInput && secSpan) {
  secInput.addEventListener('input', () => {
    secSpan.textContent = secInput.value;
  });
}
if (soundDropdown) {
  soundDropdown.addEventListener('change', previewSound);
}

// Dark mode toggle
if (darkModeToggle) {
  darkModeToggle.addEventListener('click', toggleDarkMode);
}

// Install prompt event listeners
if (installBtn) installBtn.addEventListener('click', handleInstall);
if (dismissBtn) dismissBtn.addEventListener('click', dismissInstall);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    if (playBtn && !playBtn.classList.contains('hidden')) {
      startTimer();
    } else if (pauseBtn && !pauseBtn.classList.contains('hidden')) {
      pauseTimer();
    }
  }
  
  if (e.code === 'Escape') {
    if (settingsElement && !settingsElement.classList.contains('hidden')) {
      settingsElement.classList.add('hidden');
    }
  }
});

// Visibility change - pause timer when tab is not active
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.countdown) {
    // Optionally pause when tab becomes hidden
    // pauseTimer();
  }
});
