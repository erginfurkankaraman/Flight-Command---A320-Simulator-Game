// ---------------------- SKY / CLOUDS SETUP ----------------------

const canvas = document.getElementById("skyCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

// Game state
let gameStarted = false;
let gamePhase = "TAKEOFF";
let currentAltitude = 0;
let targetAltitude = 0;
let altitudeUpdateInterval = null;

// Background music
const bgMusic = document.getElementById("bg-music");
let musicStarted = false;
let musicVolume = 1.0; // Default 100% (which is 20% of actual volume)
let fxVolume = 1.0; // Default 100% for sound effects

// Sound effects
const takeoffSound = new Audio('02_sound_effects/takeoff_sound.mp3');
const turbulenceSound = new Audio('02_sound_effects/turbulence_sound.mp3');
const birdStrikeSound = new Audio('02_sound_effects/bird_strike_sound.mp3');
const rainSound = new Audio('02_sound_effects/rain_sound.mp3');
const applauseSound = new Audio('02_sound_effects/applause_sound.mp3');
const flightPathErrorSound = new Audio('02_sound_effects/flight_path_error_sound.mp3');

// Set sound effect volumes (will be multiplied by fxVolume)
function updateSoundVolumes() {
  takeoffSound.volume = 0.3 * fxVolume;
  turbulenceSound.volume = 0.25 * fxVolume;
  birdStrikeSound.volume = 0.4 * fxVolume;
  rainSound.volume = 0.2 * fxVolume;
  applauseSound.volume = 0.4 * fxVolume;
  flightPathErrorSound.volume = 0.35 * fxVolume;
}

updateSoundVolumes();
turbulenceSound.loop = true;
rainSound.loop = true;
flightPathErrorSound.loop = true;

function startMusic() {
  if (!bgMusic || musicStarted) return;
  musicStarted = true;
  bgMusic.loop = true;
  bgMusic.volume = musicVolume * 0.05; // Scale to max 20% actual volume

  const p = bgMusic.play();
  if (p && p.catch) p.catch(() => {});
}

// Takeoff background
const takeoffImg = new Image();
takeoffImg.src = "01_images/takeoff.png";

// Landing background
const landingImg = new Image();
landingImg.src = "01_images/landing.png";

// Takeoff transition
let takeoffTransition = false;
let transitionY = 0;
const TRANSITION_SPEED = 0.5;

// Landing transition
let landingTransition = false;
let landingY = 0;
let showEndScreen = false;

// Turbulence effect
let turbulenceActive = false;
let turbulenceShakeX = 0;
let turbulenceShakeY = 0;

// Cloud generation control
let cloudsActive = false;

// Rain effect
let rainActive = false;
let raindrops = [];

// Cloud sprites
const cloudSources = ["01_images/cloud_sprite.png", "01_images/cloud_sprite_2.png"];
const cloudImgs = cloudSources.map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

const CLOUD_COUNT = 40;
const clouds = [];

function resetCloud(c) {
  c.x = Math.random() * 2 - 1;
  c.y = Math.random() * 0.6 - 0.1;
  c.z = Math.random() * 0.9 + 0.1;
  c.speed = (1 - c.z) * 0.004 + 0.0008;
  c.img = cloudImgs[Math.floor(Math.random() * cloudImgs.length)];
}

for (let i = 0; i < CLOUD_COUNT; i++) {
  const c = {};
  resetCloud(c);
  clouds.push(c);
}

// ---------------------- BIRD SYSTEM ----------------------
let birds = [];
let birdSpawned = false;
let birdCrash = false;
let birdStrikePendingScenario = false;
let birdCrashes = [];
let birdImages = [];
const birdHitImage = new Image();
birdHitImage.src = "01_images/bird_hit.png";

["01_images/bird1.png", "01_images/bird2.png", "01_images/bird3.png"].forEach(src => {
  const img = new Image();
  img.src = src;
  birdImages.push(img);
});

function spawnBirdStrike() {
    if (birdSpawned || birdCrash) return;
    birdSpawned = true;
    birds = [];

    // Play bird strike sound
    birdStrikeSound.play().catch(() => {});

    for (let i = 0; i < 3; i++) {
        const leftWindow = Math.random() < 0.5;
        const centerX = leftWindow ? -0.15 : 0.15;
        const minY = -0.1;
        const maxY = 0.0;

        birds.push({
            x: centerX + (Math.random() - 0.5) * 0.12,
            y: Math.random() * (maxY - minY) + minY,
            z: 1.6 + Math.random() * 0.6,
            speed: 0.006 + Math.random() * 0.0002,
            frame: 0,
            frameTick: 0
        });
    }
}

// ---------------------- MAIN DRAW LOOP ----------------------

function draw() {
  if (!gameStarted) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    requestAnimationFrame(draw);
    return;
  }
  
  if (turbulenceActive) {
    turbulenceShakeX = (Math.random() - 0.5) * 8;
    turbulenceShakeY = (Math.random() - 0.5) * 8;
    ctx.save();
    ctx.translate(turbulenceShakeX, turbulenceShakeY);
  }
  
  if (gamePhase === "TAKEOFF" && !takeoffTransition) {
    ctx.fillStyle = "#7c9cf5";
    ctx.fillRect(0, 0, W, H);
    
    if (takeoffImg.complete) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(takeoffImg, 0, 0, W, H);
      ctx.restore();
    }
  } else if (takeoffTransition) {
    ctx.fillStyle = "#7c9cf5";
    ctx.fillRect(0, 0, W, H);
    
    if (takeoffImg.complete) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(takeoffImg, 0, transitionY, W, H);
      ctx.restore();
    }
    
    const gradient = ctx.createLinearGradient(0, transitionY - H, 0, transitionY);
    gradient.addColorStop(0, "#9bb0f7");
    gradient.addColorStop(0.5, "#7c9cf5");
    gradient.addColorStop(1, "#7c9cf5");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, transitionY - H, W, H);
    
    transitionY += TRANSITION_SPEED;
    
    if (transitionY >= H / 4 && !cloudsActive) {
      cloudsActive = true;
    }
    
    if (transitionY >= H) {
      gamePhase = "CRUISE";
      takeoffTransition = false;
      transitionY = 0;
      setTimeout(() => {
        turbulenceActive = true;
        turbulenceScenarioPending = true;
        // Start turbulence sound
        turbulenceSound.play().catch(() => {});
        setTimeout(() => {
          showFirstOfficerMessage("Captain, we're experiencing moderate turbulence. Recommend we request a different altitude.");
          // Enable space and show start box after turbulence begins
          setTimeout(() => {
            canPressSpace = true;
            if (startBox) startBox.style.display = "block";
          }, 1000);
        }, 500);
      }, 2000);
    }
  } else if (gamePhase === "LANDING" && !landingTransition) {
    ctx.fillStyle = "#7c9cf5";
    ctx.fillRect(0, 0, W, H);
    
    if (landingImg.complete) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(landingImg, 0, 0, W, H);
      ctx.restore();
    }
  } else if (landingTransition) {
    ctx.fillStyle = "#7c9cf5";
    ctx.fillRect(0, 0, W, H);
    
    const gradient = ctx.createLinearGradient(0, -landingY, 0, H - landingY);
    gradient.addColorStop(0, "#9bb0f7");
    gradient.addColorStop(0.5, "#7c9cf5");
    gradient.addColorStop(1, "#7c9cf5");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, -landingY, W, H);
    
    if (landingImg.complete) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(landingImg, 0, H - landingY, W, H);
      ctx.restore();
    }
    
    landingY += TRANSITION_SPEED;
    
    if (landingY >= H) {
      gamePhase = "LANDING";
      landingTransition = false;
      landingY = 0;
      showEndScreen = true;
      // Stop rain sound
      rainSound.pause();
      rainSound.currentTime = 0;
      // Play applause after 1 second
      setTimeout(() => {
        applauseSound.play().catch(() => {});
        showFirstOfficerMessage("Smooth landing, Captain! Welcome to the gate. Excellent flight management today.");
        // Enable space after landing message
        setTimeout(() => {
          canPressSpace = true;
          if (startBox) startBox.style.display = "block";
        }, 1500);
      }, 1000);
    }
  } else {
    ctx.fillStyle = "#7c9cf5";
    ctx.fillRect(0, 0, W, H);
  }

  const horizonY = H * 0.45;

  if (cloudsActive) {
    for (const c of clouds) {
      c.z -= c.speed;
      if (c.z <= 0.05) resetCloud(c);

      const scale = (1.0 / c.z) * 12;
      const screenX = W / 2 + (c.x * (W * 0.4)) / c.z;
      const screenY = horizonY + (c.y * (H * 0.8)) / c.z;
      const w = scale * 4;
      const h = scale * 2;

      if (
        screenX + w < 0 ||
        screenX - w > W ||
        screenY - h > H ||
        screenY + h < 0
      ) {
        continue;
      }

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        c.img,
        Math.floor(screenX - w / 2),
        Math.floor(screenY - h / 2),
        Math.ceil(w),
        Math.ceil(h)
      );
      ctx.restore();
    }
  }

  if (birdSpawned) {
    let allCrashed = true;
    
    for (const b of birds) {
      if (!b.crashed) {
        allCrashed = false;
        b.z -= b.speed;
        
        const scale = (1.0 / b.z) * 18;
        const screenX = W / 2 + (b.x * (W * 0.3)) / b.z;
        const screenY = H * 0.35 + (b.y * (H * 0.6)) / b.z;
        const w = scale * 4;
        const h = scale * 4;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          birdImages[b.frame],
          Math.floor(screenX - w / 2),
          Math.floor(screenY - h / 2),
          Math.ceil(w),
          Math.ceil(h)
        );
        ctx.restore();

        b.frameTick++;
        if (b.frameTick >= 8) {
          b.frame = (b.frame + 1) % birdImages.length;
          b.frameTick = 0;
        }
        
        if (b.z <= 0.25) {
          birdCrashes.push({ x: screenX, y: screenY });
          b.crashed = true;
        }
      }
    }
    
    if (allCrashed && !birdCrash) {
      birdCrash = true;
      birdStrikePendingScenario = true;
      setTimeout(() => {
        showFirstOfficerMessage("Captain! Bird strike! Checking all systems... engines look normal, aircraft is stable.");
        // Enable space after bird strike message
        setTimeout(() => {
          canPressSpace = true;
          if (startBox) startBox.style.display = "block";
        }, 1500);
      }, 800);
    }
  }

  if (birdCrashes.length > 0) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.imageSmoothingEnabled = false;
    const crashSize = 180;
    
    for (const crash of birdCrashes) {
      ctx.drawImage(birdHitImage, crash.x - crashSize/2, crash.y - crashSize/2, crashSize, crashSize);
    }
    
    ctx.restore();
  }
  
  if (rainActive) {
    while (raindrops.length < 100) {
      raindrops.push({
        x: Math.random() * W,
        y: Math.random() * H - H,
        speed: 8 + Math.random() * 4,
        length: 15 + Math.random() * 10
      });
    }
    
    ctx.save();
    ctx.strokeStyle = "rgba(174, 194, 224, 0.6)";
    ctx.lineWidth = 5;
    
    for (let i = raindrops.length - 1; i >= 0; i--) {
      const drop = raindrops[i];
      
      const dx = drop.length * 0.577;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + dx, drop.y + drop.length);
      ctx.stroke();
      
      drop.y += drop.speed;
      drop.x += drop.speed * 0.577;
      
      if (drop.y > H + 50) {
        raindrops.splice(i, 1);
      }
    }
    
    ctx.restore();
  }
  
  if (turbulenceActive) {
    ctx.restore();
  }

  requestAnimationFrame(draw);
}

draw();

// ---------------------- INCIDENT / QUIZ LOGIC ----------------------

const INCIDENT_TAKEOFF = 0;
const INCIDENT_CRUISE = 1;
const INCIDENT_NAVIGATION = 2;
const INCIDENT_BIRD = 3;
const INCIDENT_LANDING = 4;

const incidents = [
  {
    hud_alt: "ALT: 0 FT",
    scenario_text:
      "You are at RWY 26, holding short, cleared for takeoff. Weather is good and performance calculations are complete. You advance onto the runway and line up. What is the correct sequence to conduct a safe takeoff?",
    options: [
      "Set thrust to TOGA/FLEX immediately, rotate at 80 knots, gear up before positive climb.",
      "Stabilize engines, advance thrust to TOGA/FLEX, monitor V1/VR/V2, rotate at VR, confirm positive climb, then retract gear.",
      "Keep thrust at idle, wait on runway for 30 seconds, then takeoff without checking speeds."
    ],
    recommended_option_index: 1,
    first_officer_response: "Nice rotation, Captain! Gear coming up. We're climbing out smoothly.",
    feedback_if_correct:
      "Correct. Before takeoff, engines are stabilized, thrust set to TOGA/FLEX, parameters monitored. At VR rotate smoothly, positive climb confirmed, then gear up.",
    feedback_if_incorrect:
      "Incorrect. Safe takeoff requires thrust stabilization, proper rotation at VR, and gear retraction only after positive climb. Early rotation or idle takeoff is unsafe."
  },
  {
    hud_alt: "ALT: FL360",
    scenario_text:
      "You are in cruise at FL360. Suddenly, the aircraft encounters moderate turbulence. Seat belt signs are on. A flight attendant reports that some passengers are uncomfortable but no injuries. The turbulence continues. What is your best course of action?",
    options: [
      "Request a different altitude from ATC to find smoother air, ensure all passengers and crew are seated, and monitor the situation.",
      "Continue at the same altitude and ignore the turbulence since it's normal.",
      "Make an emergency descent immediately to get out of the turbulence."
    ],
    recommended_option_index: 0,
    first_officer_response: "Good call, Captain. I'll coordinate with ATC for a smoother altitude. Should be more comfortable soon.",
    feedback_if_correct:
      "Correct. Requesting a different altitude to avoid turbulence while ensuring everyone's safety is the appropriate action. Monitor the situation and keep passengers informed.",
    feedback_if_incorrect:
      "Incorrect. Moderate turbulence should be managed by requesting a smoother altitude. Ignoring it risks passenger comfort and safety, while emergency descent is unnecessary for moderate turbulence."
  },
  {
    hud_alt: "ALT: FL340",
    scenario_text:
      "You've climbed to FL340 after the turbulence. ATC contacts you: 'Flight 320, we're showing a slight deviation from your flight plan route. Confirm your navigation is accurate.' You check and notice the Flight Management System is showing a minor GPS drift. What do you do?",
    options: [
      "Cross-check with backup navigation systems, verify your position, inform ATC of the issue, and continue monitoring while maintaining safe flight.",
      "Ignore the issue since it's just a minor drift and continue as planned.",
      "Declare an emergency and request immediate vectors to the nearest airport."
    ],
    recommended_option_index: 0,
    first_officer_response: "Captain, I've cross-checked our position with the backup systems. We're on track now. I'll keep monitoring it closely.",
    feedback_if_correct:
      "Correct. Minor navigation discrepancies require verification with backup systems and clear communication with ATC. The issue is manageable and doesn't require emergency procedures.",
    feedback_if_incorrect:
      "Incorrect. Navigation issues should always be verified and communicated to ATC. Ignoring it could lead to route deviations, while declaring an emergency is excessive for a minor drift."
  },
  {
    hud_alt: "ALT: 8000 FT",
    scenario_text:
      "You are descending through 8000 feet on approach to your destination. Multiple birds strike the aircraft. You hear a loud bang and feel a slight vibration, but all engines are operating normally and the aircraft remains fully controllable. What is your immediate action?",
    options: [
      "Continue the approach normally, monitor all instruments closely, notify ATC of the bird strike, and complete the landing. Inspect the aircraft after landing.",
      "Immediately declare an emergency and divert to the nearest airport.",
      "Shut down one engine as a precaution and return to departure airport."
    ],
    recommended_option_index: 0,
    first_officer_response: "Roger, Captain. All systems are green. I'll notify ATC about the bird strike. We're stable for landing.",
    feedback_if_correct:
      "Correct. With all engines operating normally and aircraft controllable, continuing the approach while monitoring systems is appropriate. Notify ATC and inspect after landing.",
    feedback_if_incorrect:
      "Incorrect. When engines are operating normally after a bird strike, continuing the approach is safe. Unnecessary diversions or shutdowns can create additional risks."
  },
  {
    hud_alt: "ALT: 800 FT",
    scenario_text:
      "After the bird strike, you are on final approach to RWY 04 in light rain. All systems are operating normally. You have visual contact with the runway, the aircraft is stable, and you're cleared to land. What is your safest course of action?",
    options: [
      "Continue the stabilized approach, monitor speed and glidepath, and land normally.",
      "Go around immediately due to the earlier bird strike.",
      "Request to hold in the air while you re-check all systems."
    ],
    recommended_option_index: 0,
    first_officer_response: "Stabilized approach confirmed, Captain. Runway in sight. Landing clearance received. Nice job handling that bird strike.",
    feedback_if_correct:
      "Correct. With all systems normal and a stabilized approach, completing the landing is safe. You've monitored the aircraft since the bird strike and everything is functioning properly.",
    feedback_if_incorrect:
      "Incorrect. Since all systems are normal and the approach is stabilized, there's no reason to go around or hold. Complete the safe landing."
  }
];

// DOM
const overlay = document.getElementById("incident-overlay");
const textEl = document.getElementById("incident-text");
const feedbackEl = document.getElementById("feedback");
const scoreEl = document.getElementById("score");
const finalScoreEl = document.getElementById("final-score");
const hudAltEl = document.getElementById("hud-alt");
const startBox = document.getElementById("start-box");
const startBtn = document.getElementById("start-btn");
const continueBtn = document.getElementById("continue-btn");
const optionButtons = Array.from(document.querySelectorAll(".options button"));

// Menu screens
const mainMenu = document.getElementById("main-menu");
const briefingScreen = document.getElementById("briefing-screen");
const endScreen = document.getElementById("end-screen");
const settingsScreen = document.getElementById("settings-screen");
const menuStartBtn = document.getElementById("menu-start-btn");
const menuSettingsBtn = document.getElementById("menu-settings-btn");
const briefingStartBtn = document.getElementById("briefing-start-btn");
const replayBtn = document.getElementById("replay-btn");
const settingsBackBtn = document.getElementById("settings-back-btn");
const volumeSlider = document.getElementById("volume-slider");
const volumeValue = document.getElementById("volume-value");
const fxSlider = document.getElementById("fx-slider");
const fxValue = document.getElementById("fx-value");

const hudPhaseEl = document.getElementById("hud-phase");

let score = 0;
let scenarioActive = false;
let hasAnsweredCorrectly = false;
let hasAttemptedWrong = false; // Track if user made wrong attempts
let activeIncidentIndex = null;
let scenariosCompleted = 0;
let firstOfficerMessagePending = false;
let pendingFirstOfficerMessage = "";
let turbulenceScenarioPending = false;
let navigationScenarioPending = false;
let landingScenarioPending = false;
let gameComplete = false;
let canPressSpace = false; // New flag to control space input

// Menu button handlers
menuStartBtn.addEventListener("click", () => {
  mainMenu.style.display = "none";
  briefingScreen.style.display = "flex";
});

menuSettingsBtn.addEventListener("click", () => {
  mainMenu.style.display = "none";
  settingsScreen.style.display = "flex";
});

settingsBackBtn.addEventListener("click", () => {
  settingsScreen.style.display = "none";
  mainMenu.style.display = "flex";
});

// Volume control
volumeSlider.addEventListener("input", (e) => {
  musicVolume = e.target.value / 100; // 0 to 1
  volumeValue.textContent = e.target.value + "%";
  if (bgMusic && musicStarted) {
    bgMusic.volume = musicVolume * 0.04; // Scale to max 20% actual volume
  }
});

// FX Volume control
fxSlider.addEventListener("input", (e) => {
  fxVolume = e.target.value / 100; // 0 to 1
  fxValue.textContent = e.target.value + "%";
  updateSoundVolumes();
});

briefingStartBtn.addEventListener("click", () => {
  briefingScreen.style.display = "none";
  gameStarted = true;
  startMusic();
  
  // Initialize HUD
  updatePhase("TAKEOFF");
  updateAltitude(0);
  
  // Add First Officer image to the screen (permanent)
  const foImage = document.createElement('img');
  foImage.id = 'first-officer-image';
  foImage.src = '01_images/first_officer.png';
  foImage.style.cssText = `
    position: fixed;
    bottom: 0;
    right: 20px;
    height: 35vh;
    z-index: 999;
    image-rendering: pixelated;
    opacity: 0.4;
    transition: all 0.3s ease;
  `;
  document.body.appendChild(foImage);
  
  if (startBox) {
    startBox.style.display = "block";
    canPressSpace = true; // Enable space after briefing
  }
});

replayBtn.addEventListener("click", () => {
  location.reload();
});

document.getElementById("menu-exit-btn").addEventListener("click", () => window.close());
document.getElementById("end-exit-btn").addEventListener("click", () => window.close());

// Update phase display
function updatePhase(phase) {
  gamePhase = phase;
  if (hudPhaseEl) {
    hudPhaseEl.textContent = "PHASE: " + phase;
  }
}

// Update altitude with smooth transition
function updateAltitude(target) {
  targetAltitude = target;
  
  // Clear existing interval
  if (altitudeUpdateInterval) {
    clearInterval(altitudeUpdateInterval);
  }
  
  // Smoothly transition altitude
  altitudeUpdateInterval = setInterval(() => {
    if (currentAltitude < targetAltitude) {
      currentAltitude += Math.ceil((targetAltitude - currentAltitude) / 20);
      if (currentAltitude > targetAltitude) currentAltitude = targetAltitude;
    } else if (currentAltitude > targetAltitude) {
      currentAltitude -= Math.ceil((currentAltitude - targetAltitude) / 20);
      if (currentAltitude < targetAltitude) currentAltitude = targetAltitude;
    }
    
    // Update display
    if (hudAltEl) {
      if (currentAltitude >= 18000) {
        const flightLevel = Math.round(currentAltitude / 100);
        hudAltEl.textContent = "ALT: FL" + flightLevel;
      } else {
        hudAltEl.textContent = "ALT: " + currentAltitude + " FT";
      }
    }
    
    // Stop when reached target
    if (currentAltitude === targetAltitude) {
      clearInterval(altitudeUpdateInterval);
      altitudeUpdateInterval = null;
    }
  }, 100);
}

// Show specific incident by index
function showIncidentByIndex(idx) {
  const inc = incidents[idx];
  if (!inc) return;

  canPressSpace = false; // Disable space when scenario is active
  if (startBox) startBox.style.display = "none";

  // Stop flight path error sound when navigation scenario opens
  if (idx === INCIDENT_NAVIGATION) {
    flightPathErrorSound.pause();
    flightPathErrorSound.currentTime = 0;
  }

  activeIncidentIndex = idx;
  scenarioActive = true;
  hasAnsweredCorrectly = false;
  hasAttemptedWrong = false; // Reset wrong attempt tracker

  // Update HUD based on scenario
  if (idx === INCIDENT_TAKEOFF) {
    updatePhase("TAKEOFF");
    updateAltitude(0);
  } else if (idx === INCIDENT_CRUISE) {
    updatePhase("CRUISE");
    updateAltitude(36000);
  } else if (idx === INCIDENT_NAVIGATION) {
    updatePhase("CRUISE");
    updateAltitude(34000);
  } else if (idx === INCIDENT_BIRD) {
    updatePhase("DESCENT");
    updateAltitude(8000);
  } else if (idx === INCIDENT_LANDING) {
    updatePhase("APPROACH");
    updateAltitude(800);
  }

  textEl.textContent = inc.scenario_text;
  feedbackEl.textContent = "";
  overlay.style.display = "flex";

  if (continueBtn) continueBtn.style.display = "none";

  optionButtons.forEach(btn => {
    btn.style.display = "block";
    btn.disabled = false;
  });

  inc.options.forEach((opt, i) => {
    if (!optionButtons[i]) return;
    optionButtons[i].textContent = (i + 1) + ". " + opt;
    optionButtons[i].onclick = () => chooseOption(i);
  });
}

// Close panel
function closeIncident() {
  overlay.style.display = "none";
  scenarioActive = false;
  scenariosCompleted++;
  canPressSpace = false; // Disable space during transitions

  if (activeIncidentIndex === INCIDENT_TAKEOFF) {
    takeoffTransition = true;
    if (startBox) startBox.style.display = "none";
    // Play takeoff sound
    takeoffSound.play().catch(() => {});
  }

  if (activeIncidentIndex === INCIDENT_CRUISE) {
    turbulenceActive = false;
    navigationScenarioPending = true;
    // Stop turbulence sound
    turbulenceSound.pause();
    turbulenceSound.currentTime = 0;
    // Start flight path error sound after FO message (4s) + 1.5s delay
    setTimeout(() => {
      flightPathErrorSound.play().catch(() => {});
    }, 5500);
    // Enable space after a short delay
    setTimeout(() => {
      canPressSpace = true;
      if (startBox) startBox.style.display = "block";
    }, 1500);
  }

  if (activeIncidentIndex === INCIDENT_NAVIGATION) {
    if (startBox) startBox.style.display = "none";
    if (!birdSpawned && !birdCrash) {
      // Wait 6 seconds (FO message shows for 4 seconds + 2 second buffer)
      setTimeout(spawnBirdStrike, 6000);
    }
  }

  if (activeIncidentIndex === INCIDENT_BIRD) {
    birdCrash = false;
    birdSpawned = false;
    birds = [];
    birdCrashes = [];
    birdStrikePendingScenario = false;
    landingScenarioPending = true;
    cloudsActive = false;
    rainActive = true;
    // Start rain sound
    rainSound.play().catch(() => {});
    // Enable space after a short delay
    setTimeout(() => {
      canPressSpace = true;
      if (startBox) startBox.style.display = "block";
    }, 2000);
  }

  if (activeIncidentIndex === INCIDENT_LANDING) {
    landingTransition = true;
    if (startBox) startBox.style.display = "none";
  }

  if (firstOfficerMessagePending) {
    setTimeout(() => {
      showFirstOfficerMessage(pendingFirstOfficerMessage);
      firstOfficerMessagePending = false;
      pendingFirstOfficerMessage = "";
    }, 1500);
  }
}

// Show First Officer message as transparent overlay
function showFirstOfficerMessage(message) {
  const foOverlay = document.createElement('div');
  foOverlay.style.cssText = `
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px 30px;
    border-radius: 10px;
    font-size: 18px;
    z-index: 1000;
    max-width: 80%;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    animation: fadeIn 0.5s ease-in;
  `;
  foOverlay.innerHTML = `
    <div style="margin-bottom: 10px; color: #4CAF50; font-weight: bold;">✈️ First Officer</div>
    <div>"${message}"</div>
  `;
  document.body.appendChild(foOverlay);
  
  // Highlight First Officer image
  const foImage = document.getElementById('first-officer-image');
  if (foImage) {
    foImage.style.opacity = '1';
    foImage.style.filter = 'drop-shadow(0 0 20px #4CAF50)';
    foImage.style.transform = 'scale(1.05)';
  }
  
  setTimeout(() => {
    // Remove highlight
    if (foImage) {
      foImage.style.opacity = '0.4';
      foImage.style.filter = 'none';
      foImage.style.transform = 'scale(1)';
    }
    
    foOverlay.style.animation = 'fadeOut 0.5s ease-out';
    setTimeout(() => {
      document.body.removeChild(foOverlay);
    }, 500);
  }, 4000);
}

// Handle answers
function chooseOption(index) {
  const inc = incidents[activeIncidentIndex];
  if (!inc) return;
  if (hasAnsweredCorrectly) return;

  if (index === inc.recommended_option_index) {
    hasAnsweredCorrectly = true;
    // Only award point if no wrong attempts were made
    if (!hasAttemptedWrong) {
      score++;
      scoreEl.textContent = String(score);
    }
    feedbackEl.textContent = "✅ " + inc.feedback_if_correct;
    optionButtons.forEach(btn => (btn.disabled = true));
    if (continueBtn) continueBtn.style.display = "block";
    
    pendingFirstOfficerMessage = inc.first_officer_response;
    firstOfficerMessagePending = true;
  } else {
    hasAttemptedWrong = true; // Mark that a wrong attempt was made
    feedbackEl.textContent = "⚠️ " + inc.feedback_if_incorrect + "  Try again.";
  }
}

// Start button
if (startBtn) {
  startBtn.addEventListener("click", () => {
    if (!canPressSpace) return; // Block if not allowed
    if (gameComplete) return;
    if (!gameStarted) return;
    if (!scenarioActive) {
      startMusic();
      if (showEndScreen) {
        gameComplete = true;
        canPressSpace = false;
        finalScoreEl.textContent = score;
        endScreen.style.display = "flex";
      } else if (gamePhase === "TAKEOFF") {
        showIncidentByIndex(INCIDENT_TAKEOFF);
      } else if (landingScenarioPending) {
        landingScenarioPending = false;
        showIncidentByIndex(INCIDENT_LANDING);
      } else if (birdStrikePendingScenario) {
        birdStrikePendingScenario = false;
        showIncidentByIndex(INCIDENT_BIRD);
      } else if (turbulenceScenarioPending) {
        turbulenceScenarioPending = false;
        showIncidentByIndex(INCIDENT_CRUISE);
      } else if (navigationScenarioPending) {
        navigationScenarioPending = false;
        showIncidentByIndex(INCIDENT_NAVIGATION);
      }
    }
  });
}

// Keyboard controls
window.addEventListener("keydown", e => {
  if (e.code === "Space") {
    if (!canPressSpace) return; // Block if not allowed
    if (gameComplete) return;
    if (!gameStarted) return;
    if (!scenarioActive && showEndScreen) {
      e.preventDefault();
      gameComplete = true;
      canPressSpace = false;
      finalScoreEl.textContent = score;
      endScreen.style.display = "flex";
    } else if (!scenarioActive && gamePhase === "TAKEOFF") {
      e.preventDefault();
      startMusic();
      showIncidentByIndex(INCIDENT_TAKEOFF);
    } else if (!scenarioActive && landingScenarioPending) {
      e.preventDefault();
      startMusic();
      landingScenarioPending = false;
      showIncidentByIndex(INCIDENT_LANDING);
    } else if (!scenarioActive && birdStrikePendingScenario) {
      e.preventDefault();
      startMusic();
      birdStrikePendingScenario = false;
      showIncidentByIndex(INCIDENT_BIRD);
    } else if (!scenarioActive && turbulenceScenarioPending) {
      e.preventDefault();
      startMusic();
      turbulenceScenarioPending = false;
      showIncidentByIndex(INCIDENT_CRUISE);
    } else if (!scenarioActive && navigationScenarioPending) {
      e.preventDefault();
      startMusic();
      navigationScenarioPending = false;
      showIncidentByIndex(INCIDENT_NAVIGATION);
    } else if (scenarioActive && hasAnsweredCorrectly) {
      e.preventDefault();
      closeIncident();
    }
  } else if (e.code === "Enter" && scenarioActive && hasAnsweredCorrectly) {
    e.preventDefault();
    closeIncident();
  }
});

// Continue button
if (continueBtn) {
  continueBtn.addEventListener("click", () => {
    if (!hasAnsweredCorrectly) return;
    closeIncident();
  });
}