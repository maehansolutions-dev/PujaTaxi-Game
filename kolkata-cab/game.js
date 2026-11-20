/* KOLKATA CAB - Milestones 1-2
   A self-contained Canvas driving slice with pickup, trip fares and wallet credit. */
"use strict";

// All current tuning values live here so beginners can adjust the feel safely.
const CONFIG = {
  speedMax: 155, acceleration: 52, braking: 112, reverseMax: 34,
  forwardDrag: 13, reverseDrag: 25, steeringRate: 2.15, steeringAtLowSpeed: 0.2,
  roadHalfWidth: 1.0, shoulderWidth: 0.36, curveStrength: 0.23,
  worldUnitsPerGameMetre: 100, worldUnitsPerKmhSecond: 3, pixelsPerKmH: 1,
  fareRsPerGameMetre: 50, passengerSpawnAheadUnits: 800,
  passengerPickupRadiusUnits: 70, passengerPickupMaxKmh: 7,
  passengerLateralTolerance: 0.48, destinationStopRadiusUnits: 80,
  destinationLateralTolerance: 0.55, minTripMetres: 6, maxTripMetres: 12,
  passengerRespawnDelay: 1.2, passengerMissedUnits: 150,
  rainDrops: 280, roadsideSpacing: 0.16, cameraSmooth: 5.5
};

// Optional art: every image has a separate loaded flag, so absent files always
// fall back to the canvas-drawn version below without stopping the game loop.
const IMG = {};
const IMG_LOADED = {};
const ASSET_FILES = {
  taxi_rear: "assets/taxi_rear.png",
  bridge_far: "assets/bridge_far.png",
  bridge_mid: "assets/bridge_mid.png",
  road_wet: "assets/road_wet.png",
  dash_driver: "assets/dash_driver.png"
};
for (const [name, source] of Object.entries(ASSET_FILES)) {
  const image = new Image();
  IMG[name] = image;
  IMG_LOADED[name] = false;
  image.onload = () => { IMG_LOADED[name] = true; };
  image.onerror = () => { IMG_LOADED[name] = false; };
  image.src = source;
}
function hasImg(name) { return IMG_LOADED[name] === true; }

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
const minimap = document.getElementById("minimap");
const minimapCtx = minimap ? minimap.getContext("2d") : null;
const ui = {
  speed: document.getElementById("speedValue"), bar: document.getElementById("speedBar"),
  gear: document.getElementById("gearValue"), view: document.getElementById("viewLabel"),
  camera: document.getElementById("cameraButton"), wheel: document.getElementById("steeringWheel"),
  toast: document.getElementById("toast"), wallet: document.getElementById("walletValue"),
  walletNote: document.getElementById("walletNote"), fare: document.getElementById("fareValue"),
  fareLabel: document.getElementById("fareLabel"), tripStatus: document.getElementById("tripStatus"),
  distance: document.getElementById("distanceValue"),
  walletCard: document.querySelector(".wallet-card"), fareCard: document.querySelector(".fare-card"),
  distRemaining: document.getElementById("distRemaining"),
  wantedStars: document.getElementById("wantedStars"), wantedStatus: document.getElementById("wantedStatus"),
  rpmBar: document.getElementById("rpmBar"), rpmValue: document.getElementById("rpmValue"),
  passengerCard: document.getElementById("passengerCard"), passengerName: document.getElementById("passengerName"),
  passengerDestination: document.getElementById("passengerDestination"), passengerQuote: document.getElementById("passengerQuote"),
  pauseButton: document.getElementById("pauseButton")
};

const state = {
  width: 0, height: 0, dpr: 1, lastTime: 0, elapsed: 0, distance: 0, totalMetres: 0,
  speed: 0, lateral: 0, steer: 0, camera: "chase", throttle: false,
  brake: false, reverse: false, brakeHeldAt: 0, wheelPointer: null,
  wheelOrigin: 0, wheelAngle: 0, shake: 0, rain: [], toastTimer: 0,
  roadOffset: 0, curve: 0, worldX: 0, clouds: [], wallet: 0,
  passenger: null, trip: null, respawnTimer: 0, tripsCompleted: 0,
  currentFare: 0, pickupPrompt: "", destinationProgress: 0,
  wanted: 0, rpm: 800, paused: false
};

const PEOPLE = ["Babu", "Mitali", "Arjun", "Riya", "Tanmay", "Puja"];
const DESTINATIONS = ["HOWRAH STATION", "COLLEGE STREET", "VICTORIA MEMORIAL", "PRINSEP GHAT", "ESPLANADE"];

const keys = new Set();
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const lerp = (a, b, t) => a + (b - a) * t;

function resize() {
  const box = canvas.getBoundingClientRect();
  state.width = Math.max(1, box.width);
  state.height = Math.max(1, box.height);
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  state.rain = Array.from({ length: CONFIG.rainDrops }, () => ({
    x: Math.random() * state.width, y: Math.random() * state.height,
    length: 5 + Math.random() * 16, speed: 120 + Math.random() * 260,
    opacity: .11 + Math.random() * .25, slant: 3 + Math.random() * 8
  }));
  state.clouds = Array.from({ length: 10 }, (_, i) => ({x:i/9, y:.12+Math.random()*.26, w:.08+Math.random()*.15, h:.07+Math.random()*.12}));
}
window.addEventListener("resize", resize);

function setCamera() {
  state.camera = state.camera === "chase" ? "driver" : "chase";
  ui.view.textContent = state.camera === "chase" ? "REAR CHASE" : "DRIVER SEAT";
  showToast(state.camera === "chase" ? "REAR CHASE VIEW" : "DRIVER SEAT VIEW", "Press V to switch camera");
}
ui.camera.addEventListener("click", setCamera);
ui.pauseButton.addEventListener("click", () => {
  state.paused = !state.paused;
  ui.pauseButton.innerHTML = state.paused ? "\u25B6 <span>RESUME</span>" : "\u23F8 <span>PAUSE</span>";
  showToast(state.paused ? "SHIFT PAUSED" : "SHIFT RESUMED", "Your cab is ready when you are");
});

function showToast(title, subtitle) {
  ui.toast.innerHTML = `${title}<span>${subtitle}</span>`;
  ui.toast.classList.add("visible");
  state.toastTimer = 2.1;
}

function rupees(value) {
  return `\u20B9 ${Math.max(0, value).toFixed(2)}`;
}

function spawnPassenger(aheadUnits = CONFIG.passengerSpawnAheadUnits) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const name = PEOPLE[Math.floor(Math.random() * PEOPLE.length)];
  const destination = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
  state.passenger = {
    status: "waiting", s: state.distance + aheadUnits, side,
    lane: side * 0.82, name, destination, bornAt: state.elapsed
  };
  state.currentFare = 0;
  state.respawnTimer = 0;
  state.pickupPrompt = "";
  ui.fareLabel.textContent = "NEXT FARE";
  ui.fare.textContent = rupees(0);
  ui.fareCard.classList.remove("is-ready");
}

function boardPassenger() {
  const rider = state.passenger;
  const pickupLateral = state.lateral;
  const tripMetres = CONFIG.minTripMetres + Math.random() * (CONFIG.maxTripMetres - CONFIG.minTripMetres);
  const longitudinalUnits = tripMetres * CONFIG.worldUnitsPerGameMetre;
  const destinationLateral = pickupLateral;
  // Fare distance is the straight-line pickup-to-destination distance in world space.
  const lateralWorldUnits = (destinationLateral - pickupLateral) * 250;
  const straightLineUnits = Math.hypot(longitudinalUnits, lateralWorldUnits);
  state.trip = {
    name: rider.name, destination: rider.destination,
    pickupS: state.distance, pickupLateral,
    destinationS: state.distance + longitudinalUnits,
    destinationLateral,
    straightLineUnits,
    straightLineMetres: straightLineUnits / CONFIG.worldUnitsPerGameMetre,
    longitudinalUnits,
    bornAt: state.elapsed
  };
  state.passenger = null;
  state.currentFare = 0;
  state.destinationProgress = 0;
  state.pickupPrompt = "";
  ui.fareCard.classList.add("is-active");
  ui.fareCard.classList.remove("is-ready");
  ui.fareLabel.textContent = "LIVE FARE \u00B7 \u20B950 / M";
  showToast(`${state.trip.name.toUpperCase()} BOARDED`, `Destination: ${state.trip.destination}`);
}

function dropOffPassenger() {
  const fareEarned = state.trip.straightLineMetres * CONFIG.fareRsPerGameMetre;
  state.wallet += fareEarned;
  state.currentFare = fareEarned;
  state.tripsCompleted += 1;
  ui.walletNote.textContent = `+${rupees(fareEarned)} \u00B7 LAST FARE`;
  ui.walletCard.classList.remove("is-credit");
  void ui.walletCard.offsetWidth;
  ui.walletCard.classList.add("is-credit");
  window.setTimeout(() => ui.walletCard.classList.remove("is-credit"), 440);
  const name = state.trip.name;
  state.trip = null;
  state.destinationProgress = 0;
  state.respawnTimer = CONFIG.passengerRespawnDelay;
  ui.fareLabel.textContent = "FARE COLLECTED";
  ui.fareCard.classList.remove("is-active");
  ui.fareCard.classList.add("is-ready");
  showToast(`${name.toUpperCase()} DROPPED OFF`, `+${rupees(fareEarned)} added to your wallet`);
}

function updatePassengerSystem(dt) {
  state.pickupPrompt = "";
  if (state.passenger) {
    const rider = state.passenger;
    const delta = rider.s - state.distance;
    const metresAway = Math.abs(delta) / CONFIG.worldUnitsPerGameMetre;
    const aligned = Math.abs(state.lateral - rider.lane) <= CONFIG.passengerLateralTolerance;
    const slowEnough = Math.abs(state.speed) <= CONFIG.passengerPickupMaxKmh;
    if (Math.abs(delta) <= CONFIG.passengerPickupRadiusUnits && aligned && slowEnough) {
      boardPassenger();
    } else if (metresAway < 4.5) {
      state.pickupPrompt = Math.abs(delta) <= CONFIG.passengerPickupRadiusUnits && !slowEnough
        ? "BRAKE AND STOP TO PICK UP"
        : !aligned ? "PULL OVER TO THE HAILING PASSENGER" : "STOP BESIDE THE PASSENGER";
    }
    if (state.passenger && delta < -CONFIG.passengerMissedUnits) {
      state.passenger = null;
      state.respawnTimer = CONFIG.passengerRespawnDelay;
      showToast("PASSENGER MISSED", "A new fare will appear up the road");
    }
  }

  if (state.trip) {
    const trip = state.trip;
    const progressUnits = clamp(state.distance - trip.pickupS, 0, trip.longitudinalUnits);
    state.destinationProgress = progressUnits / trip.longitudinalUnits;
    state.currentFare = state.destinationProgress * trip.straightLineMetres * CONFIG.fareRsPerGameMetre;
    const remaining = trip.destinationS - state.distance;
    const aligned = Math.abs(state.lateral - trip.destinationLateral) <= CONFIG.destinationLateralTolerance;
    const slowEnough = Math.abs(state.speed) <= CONFIG.passengerPickupMaxKmh;
    if (Math.abs(remaining) < 4.5 * CONFIG.worldUnitsPerGameMetre) {
      state.pickupPrompt = Math.abs(remaining) <= CONFIG.destinationStopRadiusUnits && aligned && !slowEnough
        ? "BRAKE AND STOP TO DROP OFF"
        : Math.abs(remaining) <= CONFIG.destinationStopRadiusUnits && !aligned
          ? "ALIGN WITH THE DESTINATION MARKER"
          : "DESTINATION AHEAD \u00B7 SLOW DOWN";
    }
    const passedDestination = remaining < -CONFIG.destinationStopRadiusUnits && remaining > -CONFIG.destinationStopRadiusUnits * 3;
    if ((Math.abs(remaining) <= CONFIG.destinationStopRadiusUnits && aligned && slowEnough) || passedDestination) {
      dropOffPassenger();
    }
  }

  if (!state.passenger && !state.trip) {
    state.respawnTimer -= dt;
    if (state.respawnTimer <= 0) spawnPassenger(CONFIG.passengerSpawnAheadUnits);
  }
  ui.wallet.textContent = rupees(state.wallet);
  ui.fare.textContent = rupees(state.currentFare);
  ui.distance.textContent = `${(state.totalMetres / 1000).toFixed(2)} KM`;
  if (state.trip) {
    const remainingMetres = Math.max(0, state.trip.destinationS - state.distance) / CONFIG.worldUnitsPerGameMetre;
    ui.tripStatus.textContent = state.pickupPrompt || `TO ${state.trip.destination} \u00B7 ${remainingMetres.toFixed(1)} M LEFT`;
    ui.fareCard.classList.add("is-active");
  } else if (state.passenger) {
    const aheadMetres = Math.max(0, state.passenger.s - state.distance) / CONFIG.worldUnitsPerGameMetre;
    ui.fareLabel.textContent = "NEXT FARE";
    ui.tripStatus.textContent = state.pickupPrompt || `HAILING \u00B7 ${state.passenger.name.toUpperCase()} \u00B7 ${aheadMetres.toFixed(1)} M AHEAD`;
    ui.fareCard.classList.remove("is-active", "is-ready");
    state.currentFare = 0;
    ui.fare.textContent = rupees(0);
  } else {
    ui.tripStatus.textContent = state.tripsCompleted > 0 ? "FARE BANKED \u00B7 NEXT HAIL SOON" : "FINDING THE NEXT PASSENGER";
    ui.fareCard.classList.remove("is-active");
    ui.fare.textContent = rupees(state.currentFare);
  }
}

function keyName(event) {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}
window.addEventListener("keydown", event => {
  const key = keyName(event);
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(key)) event.preventDefault();
  if (key === "v" && !event.repeat) setCamera();
  keys.add(key);
  if (key === "ArrowUp" || key === "w") state.throttle = true;
  if ((key === "ArrowDown" || key === "s") && !state.brake) { state.brake = true; state.brakeHeldAt = performance.now(); }
});
window.addEventListener("keyup", event => {
  const key = keyName(event);
  keys.delete(key);
  if (key === "ArrowUp" || key === "w") state.throttle = false;
  if (key === "ArrowDown" || key === "s") { state.brake = false; state.reverse = false; }
});
window.addEventListener("blur", () => { keys.clear(); state.throttle = false; state.brake = false; state.reverse = false; });

// Pointer controls are captured so holding a pedal continues outside its button.
document.querySelectorAll("[data-control]").forEach(button => {
  const control = button.dataset.control;
  const down = event => {
    event.preventDefault(); button.setPointerCapture?.(event.pointerId); button.classList.add("active");
    if (control === "accelerate") state.throttle = true;
    else { state.brake = true; state.brakeHeldAt = performance.now(); }
  };
  const up = event => {
    event.preventDefault(); button.classList.remove("active");
    if (control === "accelerate") state.throttle = false;
    else { state.brake = false; state.reverse = false; }
  };
  button.addEventListener("pointerdown", down);
  ["pointerup","pointercancel","lostpointercapture"].forEach(name => button.addEventListener(name, up));
});

ui.wheel.addEventListener("pointerdown", event => {
  event.preventDefault(); ui.wheel.setPointerCapture(event.pointerId); state.wheelPointer = event.pointerId;
  state.wheelOrigin = event.clientX; state.wheelAngle = 0;
});
ui.wheel.addEventListener("pointermove", event => {
  if (event.pointerId !== state.wheelPointer) return;
  state.wheelAngle = clamp((event.clientX - state.wheelOrigin) / 82, -1, 1);
});
function releaseWheel(event) { if (event.pointerId === state.wheelPointer) { state.wheelPointer = null; state.wheelAngle = 0; } }
ui.wheel.addEventListener("pointerup", releaseWheel);
ui.wheel.addEventListener("pointercancel", releaseWheel);

function update(dt) {
  state.elapsed += dt;
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) ui.toast.classList.remove("visible");
  }
  const up = state.throttle || keys.has("ArrowUp") || keys.has("w");
  const down = state.brake || keys.has("ArrowDown") || keys.has("s");
  const left = keys.has("ArrowLeft") || keys.has("a");
  const right = keys.has("ArrowRight") || keys.has("d");
  const steerInput = (right ? 1 : 0) - (left ? 1 : 0) + state.wheelAngle;

  if (down) {
    if (performance.now() - state.brakeHeldAt > 420 && state.speed < 9) state.reverse = true;
    if (state.speed > 0.8) state.speed = Math.max(0, state.speed - CONFIG.braking * dt);
    else if (state.reverse) state.speed = Math.max(-CONFIG.reverseMax, state.speed - CONFIG.acceleration * .55 * dt);
  } else {
    state.reverse = false;
    if (up) state.speed = Math.min(CONFIG.speedMax, state.speed + CONFIG.acceleration * dt);
    else if (state.speed > 0) state.speed = Math.max(0, state.speed - CONFIG.forwardDrag * dt);
    else if (state.speed < 0) state.speed = Math.min(0, state.speed + CONFIG.reverseDrag * dt);
  }

  const speedRatio = Math.min(1, Math.abs(state.speed) / 36);
  const turnPower = CONFIG.steeringAtLowSpeed + speedRatio * (1 - CONFIG.steeringAtLowSpeed);
  state.steer = clamp(steerInput, -1, 1);
  state.lateral += state.steer * CONFIG.steeringRate * turnPower * (state.speed < 0 ? -1 : 1) * dt;
  state.lateral = clamp(state.lateral, -1.48, 1.48);
  const roadCurve = Math.sin(state.distance * .000042) * CONFIG.curveStrength;
  state.curve = lerp(state.curve, roadCurve, Math.min(1, dt * 1.7));
  // A small arcade pacing scale gives each short fare enough seconds to react to it.
  state.distance += state.speed * dt * CONFIG.worldUnitsPerKmhSecond;
  state.totalMetres += Math.abs(state.speed) * dt * CONFIG.worldUnitsPerKmhSecond / CONFIG.worldUnitsPerGameMetre;
  state.roadOffset += state.speed * dt * .72;
  updatePassengerSystem(dt);

  const edge = CONFIG.roadHalfWidth + CONFIG.shoulderWidth;
  if (Math.abs(state.lateral) > edge) {
    state.speed *= Math.max(0, 1 - dt * 2.1);
    state.lateral = clamp(state.lateral, -edge, edge);
  }
  state.shake = Math.max(0, state.shake - dt * 22);
  const speed = Math.round(Math.abs(state.speed) * .92);
  ui.speed.textContent = String(speed).padStart(2, "0");
  ui.bar.style.width = `${Math.min(100, speed / 155 * 100)}%`;
  ui.gear.textContent = state.reverse ? "R" : speed > 0 ? "D" : "N";
  const wheel = ui.wheel.querySelector(".wheel-ring");
  wheel.style.transform = `rotate(${state.steer * 170}deg)`;
  for (const drop of state.rain) {
    drop.y += (drop.speed + speed * 1.6) * dt;
    drop.x -= (20 + speed * .28) * dt;
    if (drop.y > state.height + 15) { drop.y = -drop.length; drop.x = Math.random() * state.width; }
    if (drop.x < -12) drop.x = state.width + 8;
  }
}

function polygon(points, fill, stroke, lineWidth=1) {
  ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
  for (let i=1;i<points.length;i++) ctx.lineTo(points[i][0],points[i][1]);
  ctx.closePath(); if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
}
function roundedRect(x,y,w,h,r,fill,stroke) {
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}
function drawParallaxLayer(name, w, h, horizon, rate, horizonAnchor) {
  const image=IMG[name];
  if(!hasImg(name)||!image.naturalWidth)return false;
  const speedScale=1+Math.min(.03,Math.abs(state.speed)/CONFIG.speedMax*.03);
  const tileW=w*speedScale,tileH=tileW*image.naturalHeight/image.naturalWidth;
  const drift=(state.curve+state.worldX)*rate;
  const phase=((drift%tileW)+tileW)%tileW;
  const y=horizon-tileH*horizonAnchor;
  for(let x=-phase;x<w;x+=tileW)ctx.drawImage(image,x,y,tileW,tileH);
  return true;
}
function drawSky(w,h,horizon) {
  if(drawParallaxLayer("bridge_far",w,h,horizon,.15,.72))return;
  const sky=ctx.createLinearGradient(0,0,0,horizon);
  sky.addColorStop(0,"#080c14");sky.addColorStop(.55,"#111a27");sky.addColorStop(.86,"#25212a");sky.addColorStop(1,"#39302e");
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,horizon);
  // Monsoon cloud banks and a distant warm band of evening light.
  state.clouds.forEach((c,i)=>{
    const x=c.x*w+(state.curve*24),y=c.y*horizon;
    ctx.fillStyle=i%2?"rgba(5,12,20,.52)":"rgba(15,23,33,.46)";
    ctx.beginPath();ctx.ellipse(x,y,c.w*w,c.h*horizon,0,0,Math.PI*2);ctx.fill();
  });
}
function drawBuilding(x,base,width,height,index,far=false) {
  const palette=["#3e332e","#554438","#293633","#4a3932","#34403e"];
  const color=palette[index%palette.length];
  ctx.fillStyle=far?"#464c46":color;ctx.fillRect(x,base-height,width,height);
  ctx.fillStyle=far?"#66503b":"#927553";ctx.fillRect(x-3,base-height,width+6,5);
  const floors=far?2:Math.max(2,Math.floor(height/38));
  for(let f=0;f<floors;f++){
    const fy=base-height+14+f*((height-24)/floors);
    for(let col=0;col<Math.max(1,Math.floor(width/22));col++){
      const wx=x+7+col*22;
      ctx.fillStyle=(col+f+index)%3===0?"#f3b65d":"#233036";
      ctx.shadowColor=(col+f+index)%3===0?"#eea74d":"transparent";ctx.shadowBlur=(col+f+index)%3===0?7:0;
      ctx.fillRect(wx,fy,10,15);
      ctx.shadowBlur=0;
      if(!far){ctx.fillStyle="#9a845f";ctx.fillRect(wx-2,fy-2,14,2);ctx.fillRect(wx+4,fy,2,15);}
    }
  }
  if(!far&&width>62){
    const signW=Math.min(width-12,78),sy=base-height*.56;
    ctx.fillStyle=index%2?"#76354d":"#173f42";ctx.shadowColor=index%2?"#fa5995":"#46ddcc";ctx.shadowBlur=10;ctx.fillRect(x+6,sy,signW,17);ctx.shadowBlur=0;
    ctx.fillStyle="#ffe4b1";ctx.font="bold 8px Georgia";ctx.textAlign="center";
    ctx.fillText(["CHA ER DOKAN","PARK STREET","MISHTI GHAR","BOOKS & TEA"][index%4],x+6+signW/2,sy+12);
  }
}
function roadGeometry(w,h,horizon,depth) {
  const bottom=h*.98, t=depth;
  const y=horizon+(bottom-horizon)*t;
  const half=(w*.035)+(w*.39)*t;
  const center=w*.5+state.curve*w*.24*(t*t)+Math.sin(state.distance*.000042+t*3)*w*.012*t;
  return {y,half,center};
}
function traceRoadPolygon(far,near) {
  ctx.beginPath();ctx.moveTo(far.center-far.half,far.y);ctx.lineTo(far.center+far.half,far.y);
  ctx.lineTo(near.center+near.half,near.y);ctx.lineTo(near.center-near.half,near.y);ctx.closePath();
}
function drawCityLampGlows(w,h,horizon) {
  const positions=[.08,.23,.39,.61,.77,.92];
  positions.forEach((x,index)=>{
    const flicker=.9+.1*Math.sin(state.elapsed*5.5+index*1.7);
    const px=w*x,py=horizon+(index%2?-.01:.035)*h,radius=Math.max(25,w*.055);
    const glow=ctx.createRadialGradient(px,py,1,px,py,radius);
    glow.addColorStop(0,`rgba(255,174,89,${.27*flicker})`);glow.addColorStop(.22,`rgba(236,137,66,${.12*flicker})`);glow.addColorStop(1,"rgba(233,125,53,0)");
    ctx.fillStyle=glow;ctx.fillRect(px-radius,py-radius,radius*2,radius*2);
  });
}
function drawRoadRipples(w,h,horizon) {
  ctx.save();
  for(let i=0;i<8;i++){
    const depth=.75+i*.029,road=roadGeometry(w,h,horizon,depth),side=i%2?-.42:.38;
    const x=road.center+road.half*side,y=road.y-4+(i%3)*8;
    const pulse=.8+.2*Math.sin(state.elapsed*2+i);
    ctx.strokeStyle=`rgba(178,205,210,${.11*pulse})`;ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(x,y,7+i*2,2+i*.55,0,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.ellipse(x,y,3+i,1+i*.3,0,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
}
function drawHailingPassenger(w, h, horizon, rider) {
  const delta = rider.s - state.distance;
  if (delta < -CONFIG.passengerMissedUnits || delta > 2100) return;
  const depth = clamp(1 - delta / 2200, .015, .96);
  const road = roadGeometry(w, h, horizon, depth);
  const side = rider.side;
  const lateralOffset = (rider.lane - state.lateral) * road.half * .46 * depth;
  const x = road.center + side * (road.half + w * .02 * depth) + lateralOffset;
  const y = road.y;
  const scale = .25 + depth * .95;
  const bob = Math.sin(state.elapsed * 5.5 + rider.bornAt) * 2 * scale;
  const pulse = 0.5 + .5 * Math.sin(state.elapsed * 4.2);
  // Soft gold hail glow and a floating marker.
  ctx.save();
  ctx.globalAlpha = .2 + pulse * .13;
  ctx.fillStyle = "#ffc94f";ctx.beginPath();ctx.ellipse(x,y-39*scale,18*scale,26*scale,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffe06b";ctx.shadowColor = "#ffc742";ctx.shadowBlur = 12*scale;
  ctx.beginPath();ctx.arc(x,y-68*scale-bob,6*scale,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle="#172027";ctx.font=`bold ${Math.max(7,8*scale)}px 'DM Mono',monospace`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("!",x,y-68*scale-bob);
  // Umbrella, head and coat; one arm waves above the shoulder.
  ctx.fillStyle="#243236";ctx.beginPath();ctx.arc(x,y-25*scale+bob,8*scale,Math.PI,Math.PI*2);ctx.quadraticCurveTo(x+10*scale,y-17*scale+bob,x,y-18*scale+bob);ctx.fill();
  ctx.strokeStyle="#8c754d";ctx.lineWidth=Math.max(1,1.5*scale);ctx.beginPath();ctx.moveTo(x,y-25*scale+bob);ctx.lineTo(x,y-12*scale+bob);ctx.stroke();
  ctx.fillStyle="#f1bd72";ctx.beginPath();ctx.arc(x,y-10*scale+bob,4*scale,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#b14e38";roundedRect(x-5*scale,y-6*scale+bob,10*scale,16*scale,3*scale,"#b14e38");
  ctx.strokeStyle="#e7c18a";ctx.lineWidth=Math.max(1,2*scale);ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(x-3*scale,y+8*scale+bob);ctx.lineTo(x-5*scale,y+16*scale+bob);ctx.moveTo(x+3*scale,y+8*scale+bob);ctx.lineTo(x+5*scale,y+16*scale+bob);
  const wave=Math.sin(state.elapsed*6+rider.bornAt)*3*scale;
  ctx.moveTo(x+4*scale,y-3*scale+bob);ctx.lineTo(x+9*scale,y-14*scale+bob-wave);ctx.lineTo(x+12*scale,y-18*scale+bob-wave);ctx.stroke();
  // Name plaque stays legible at close range and naturally scales into the distance.
  if (depth > .26) {
    const labelW=Math.max(48,68*scale),labelH=Math.max(13,17*scale),labelY=y-91*scale-bob;
    roundedRect(x-labelW/2,labelY-labelH/2,labelW,labelH,5*scale,"rgba(12,20,23,.9)","#d5a83f");
    ctx.fillStyle="#ffe08a";ctx.font=`bold ${Math.max(7,8*scale)}px 'DM Mono',monospace`;ctx.fillText(`HAIL \u00B7 ${rider.name.toUpperCase()}`,x,labelY);
  }
  ctx.restore();
}
function drawDestinationMarker(w, h, horizon, trip) {
  const delta = trip.destinationS - state.distance;
  if (delta < -CONFIG.destinationStopRadiusUnits || delta > 2400) return;
  const depth=clamp(1-delta/2500,.02,.96),road=roadGeometry(w,h,horizon,depth);
  const x=road.center+(trip.destinationLateral-state.lateral)*road.half*.45*depth;
  const y=road.y-11*depth;
  const radius=Math.max(5,15*depth);
  ctx.save();
  ctx.globalAlpha=.2;ctx.fillStyle="#59e4cc";ctx.beginPath();ctx.arc(x,y,radius*2.6,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle="#5cf0d2";ctx.shadowColor="#43f0ca";ctx.shadowBlur=18*depth;
  ctx.fillRect(-radius/2,-radius/2,radius,radius);ctx.shadowBlur=0;ctx.restore();
  if(depth>.2){
    const label=`DROP OFF \u00B7 ${trip.destination}`;ctx.font=`bold ${Math.max(8,10*depth)}px 'DM Mono',monospace`;
    const labelW=Math.min(w*.48,ctx.measureText(label).width+20),labelH=Math.max(18,25*depth),labelY=y-31*depth;
    roundedRect(x-labelW/2,labelY-labelH/2,labelW,labelH,6,"rgba(8,23,24,.91)","#51dfc3");
    ctx.fillStyle="#a6ffe8";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(label,x,labelY,labelW-10);
  }
}
function drawWorld(w,h,view) {
  const horizon=h*(view==="driver"?.47:.43);
  state.worldX=state.distance;
  drawSky(w,h,horizon);
  const ground=ctx.createLinearGradient(0,horizon,0,h);ground.addColorStop(0,"#263744");ground.addColorStop(.38,"#182631");ground.addColorStop(1,"#0a121b");
  ctx.fillStyle=ground;ctx.fillRect(0,horizon,w,h-horizon);
  if(!drawParallaxLayer("bridge_mid",w,h,horizon,.4,.72)){
    // Code-drawn colonial storefronts remain as the fallback when no mid image exists.
    for(let i=0;i<6;i++){
      const t=.15+i*.15, road=roadGeometry(w,h,horizon,t), scale=.42+t*.72;
      const bw=(w*.085+22)*scale, bh=(h*.13+24)*scale;
      const leftEdge=road.center-road.half, rightEdge=road.center+road.half;
      drawBuilding(leftEdge-bw,road.y,bw,bh,i,i<2);
      drawBuilding(rightEdge,road.y,bw,bh,i+2,i<2);
    }
  }
  drawCityLampGlows(w,h,horizon);
  // Rain-dark sidewalks and stone kerbs.
  const far=roadGeometry(w,h,horizon,0), near=roadGeometry(w,h,horizon,1);
  polygon([[far.center-far.half,far.y],[far.center+far.half,far.y],[near.center+near.half,near.y],[near.center-near.half,near.y]],"#263233");
  const roadLerp=(d)=>roadGeometry(w,h,horizon,d);
  for(let i=0;i<22;i++){
    const z=((i/22+((state.roadOffset%150)/150))%1);
    const a=roadLerp(z),b=roadLerp(Math.min(1,z+.018));
    const stripe= Math.floor((i+state.roadOffset/150)%2)===0;
    const curb=Math.max(1,w*.006*z),leftA=a.center-a.half,leftB=b.center-b.half,rightA=a.center+a.half,rightB=b.center+b.half;
    polygon([[leftA,a.y],[leftA-curb,a.y],[leftB-curb,b.y],[leftB,b.y]],stripe?"#d2aa48":"#10161b");
    polygon([[rightA,a.y],[rightA+curb,a.y],[rightB+curb,b.y],[rightB,b.y]],stripe?"#d2aa48":"#10161b");
  }
  traceRoadPolygon(far,near);ctx.save();ctx.clip();
  if(hasImg("road_wet")){
    const texture=IMG.road_wet,tileW=Math.max(180,w*.58),tileH=tileW*texture.naturalHeight/texture.naturalWidth;
    const offset=((state.roadOffset%tileH)+tileH)%tileH;
    for(let y=horizon-offset-tileH;y<h+tileH;y+=tileH)for(let x=-tileW;x<w+tileW;x+=tileW)ctx.drawImage(texture,x,y,tileW,tileH);
    ctx.fillStyle="rgba(14,25,34,.2)";ctx.fillRect(0,horizon,w,h-horizon);
  }else{
    const wet=ctx.createLinearGradient(0,horizon,0,h);wet.addColorStop(0,"#18252e");wet.addColorStop(.55,"#111a21");wet.addColorStop(1,"#080e14");
    ctx.fillStyle=wet;ctx.fillRect(0,horizon,w,h-horizon);
  }
  // Warm, elongated sodium reflections sit over either road rendering path.
  for(let i=0;i<5;i++){
    const depth=.55+i*.085,road=roadGeometry(w,h,horizon,depth),x=road.center+Math.sin(state.elapsed*.25+i)*road.half*.18,y=road.y;
    const radius=Math.max(18,w*(.018+i*.004));
    const reflection=ctx.createRadialGradient(x,y,1,x,y,radius);
    reflection.addColorStop(0,"rgba(255,189,105,.24)");reflection.addColorStop(.3,"rgba(232,140,75,.1)");reflection.addColorStop(1,"rgba(222,132,70,0)");
    ctx.fillStyle=reflection;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
  ctx.restore();
  traceRoadPolygon(far,near);ctx.strokeStyle="rgba(210,190,137,.55)";ctx.lineWidth=2;ctx.stroke();
  drawRoadRipples(w,h,horizon);
  // Tram tracks and centre dashes flow toward the cab.
  for(const lane of [-.09,.09]){
    ctx.beginPath();
    for(let i=0;i<=32;i++){
      const t=i/32,g=roadGeometry(w,h,horizon,t),x=g.center+g.half*lane*2;
      if(i===0)ctx.moveTo(x,g.y);else ctx.lineTo(x,g.y);
    }
    ctx.strokeStyle="rgba(172,163,128,.48)";ctx.lineWidth=1+near.half/w*2;ctx.stroke();
  }
  for(let i=0;i<15;i++){
    const t=((i/15+(state.roadOffset%210)/210)%1),g=roadGeometry(w,h,horizon,t);
    const dashW=Math.max(1,w*.003*t),dashH=Math.max(1,h*.014*t);
    ctx.fillStyle="rgba(220,207,168,.78)";ctx.fillRect(g.center-dashW/2,g.y,dashW,dashH);
  }
  // Overhead tram cables, converging toward the vanishing point.
  ctx.strokeStyle="rgba(34,43,43,.62)";ctx.lineWidth=1;
  for(const offset of [-.18,0,.18]){
    ctx.beginPath();ctx.moveTo(w*.5+offset*w,horizon*.2);ctx.quadraticCurveTo(w*.5+state.curve*w*.2,horizon*.56,w*.5+state.curve*w*.23+offset*w*.62,horizon);ctx.stroke();
  }
  // A handful of old-fashioned street lamps.
  for(let side of [-1,1]) for(let i=0;i<5;i++){
    const t=((i/5+(state.roadOffset%310)/310)%1),g=roadGeometry(w,h,horizon,t),x=g.center+side*(g.half+w*.018*t),scale=.22+t*.9;
    ctx.strokeStyle="#2c302b";ctx.lineWidth=Math.max(1,3*scale);ctx.beginPath();ctx.moveTo(x,g.y);ctx.lineTo(x,g.y-40*scale);ctx.lineTo(x+side*11*scale,g.y-48*scale);ctx.stroke();
    ctx.fillStyle="rgba(255,190,101,.75)";ctx.beginPath();ctx.arc(x+side*11*scale,g.y-47*scale,3.6*scale,0,Math.PI*2);ctx.fill();
  }
  if (state.passenger) drawHailingPassenger(w,h,horizon,state.passenger);
  if (state.trip) drawDestinationMarker(w,h,horizon,state.trip);
  return {horizon,near};
}
function drawTaxiRear(x,y,scale) {
  if(hasImg("taxi_rear")){
    const image=IMG.taxi_rear,width=520*scale,height=width*image.naturalHeight/image.naturalWidth;
    const bounce=Math.sin(state.elapsed*8.5)*(.55+Math.abs(state.speed)*.018);
    const bottom=y+bounce,top=bottom-height;
    ctx.save();ctx.translate(x,bottom);ctx.rotate(state.steer*.03);
    const shadow=ctx.createRadialGradient(0,-2,6,0,-2,width*.42);shadow.addColorStop(0,"rgba(0,0,0,.54)");shadow.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(0,-2,width*.43,Math.max(9,width*.09),0,0,Math.PI*2);ctx.fill();
    ctx.drawImage(image,-width/2,-height,width,height);
    if(state.brake){
      ctx.save();ctx.globalCompositeOperation="lighter";
      for(const lampX of [-width*.34,width*.34]){
        const lampY=-height*.34,r=width*.1,glow=ctx.createRadialGradient(lampX,lampY,1,lampX,lampY,r);
        glow.addColorStop(0,"rgba(255,52,39,.78)");glow.addColorStop(.28,"rgba(255,31,25,.38)");glow.addColorStop(1,"rgba(255,20,20,0)");
        ctx.fillStyle=glow;ctx.fillRect(lampX-r,lampY-r,r*2,r*2);
      }
      ctx.restore();
    }
    ctx.restore();
    return;
  }
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  // Warm pools of reflected tail-light on the wet road behind the cab.
  const shadow=ctx.createRadialGradient(0,-35,15,0,-35,220);shadow.addColorStop(0,"rgba(0,0,0,.72)");shadow.addColorStop(.72,"rgba(0,0,0,.3)");shadow.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(0,-35,220,72,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="rgba(211,48,41,.2)";ctx.beginPath();ctx.ellipse(-113,-28,38,9,-.03,0,Math.PI*2);ctx.ellipse(113,-28,38,9,.03,0,Math.PI*2);ctx.fill();
  // Set the far body and right quarter panel first so the boot faces the camera.
  const side=ctx.createLinearGradient(112,-235,225,-55);side.addColorStop(0,"#d79518");side.addColorStop(.5,"#a86a12");side.addColorStop(1,"#563913");
  polygon([[94,-245],[142,-228],[202,-183],[225,-119],[216,-75],[166,-54],[145,-120]],side,"#e7bb53",3);
  // Both rear tyres and the right quarter wheel are visible below the body.
  function wheel(wx,wy,rx,ry){
    ctx.fillStyle="#070a0d";ctx.beginPath();ctx.ellipse(wx,wy,rx,ry,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#42494a";ctx.lineWidth=5;ctx.stroke();
    const hub=ctx.createRadialGradient(wx-rx*.25,wy-ry*.2,2,wx,wy,rx*.52);hub.addColorStop(0,"#ded9c5");hub.addColorStop(.7,"#85867e");hub.addColorStop(1,"#343b3e");ctx.fillStyle=hub;
    ctx.beginPath();ctx.ellipse(wx,wy,rx*.47,ry*.52,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#20282b";ctx.beginPath();ctx.arc(wx,wy,6,0,Math.PI*2);ctx.fill();
  }
  wheel(-119,-61,31,43);wheel(119,-62,31,43);wheel(190,-66,25,36);
  // Rounded Hindustan Ambassador rear shell with a broad boot and soft fenders.
  const body=ctx.createLinearGradient(-165,-250,174,-45);body.addColorStop(0,"#ffe78a");body.addColorStop(.22,"#f6c53f");body.addColorStop(.6,"#dda21b");body.addColorStop(1,"#a96912");
  ctx.beginPath();ctx.moveTo(-145,-176);ctx.quadraticCurveTo(-157,-203,-139,-234);ctx.quadraticCurveTo(-122,-262,-82,-267);ctx.lineTo(82,-267);ctx.quadraticCurveTo(125,-262,140,-232);ctx.lineTo(158,-169);ctx.lineTo(164,-76);ctx.quadraticCurveTo(151,-44,105,-39);ctx.lineTo(-105,-39);ctx.quadraticCurveTo(-151,-45,-164,-76);ctx.lineTo(-158,-153);ctx.closePath();ctx.fillStyle=body;ctx.fill();ctx.strokeStyle="#ffe278";ctx.lineWidth=3;ctx.stroke();
  // Broad curved rear window, rubber surround, upright pillars and glass glints.
  const glass=ctx.createLinearGradient(0,-260,0,-177);glass.addColorStop(0,"#0c1b25");glass.addColorStop(.55,"#263b43");glass.addColorStop(1,"#0a151d");
  polygon([[-105,-247],[-80,-257],[80,-257],[105,-247],[121,-193],[112,-183],[-112,-183],[-121,-193]],glass,"#7b8078",5);
  ctx.strokeStyle="rgba(196,222,219,.48)";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-89,-246);ctx.quadraticCurveTo(-23,-233,44,-244);ctx.stroke();
  ctx.strokeStyle="rgba(124,147,146,.48)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-76,-247);ctx.lineTo(-76,-187);ctx.moveTo(0,-255);ctx.lineTo(0,-184);ctx.moveTo(76,-247);ctx.lineTo(76,-187);ctx.stroke();
  ctx.fillStyle="rgba(242,184,91,.7)";ctx.fillRect(-57,-222,28,5);ctx.fillRect(25,-222,29,5);
  // Boot lid and chrome handle; the blue-white beltline wraps around the rear.
  ctx.strokeStyle="rgba(139,86,15,.85)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-137,-174);ctx.quadraticCurveTo(0,-164,139,-174);ctx.stroke();
  const stripe=ctx.createLinearGradient(-150,-151,150,-151);stripe.addColorStop(0,"#e9dfc1");stripe.addColorStop(.16,"#1674a7");stripe.addColorStop(.5,"#1d85b8");stripe.addColorStop(.84,"#1674a7");stripe.addColorStop(1,"#e9dfc1");
  ctx.fillStyle="#eee7d0";ctx.beginPath();ctx.moveTo(-153,-151);ctx.quadraticCurveTo(0,-144,153,-151);ctx.lineTo(154,-125);ctx.quadraticCurveTo(0,-119,-154,-125);ctx.closePath();ctx.fill();
  ctx.fillStyle=stripe;ctx.beginPath();ctx.moveTo(-153,-148);ctx.quadraticCurveTo(0,-142,153,-148);ctx.lineTo(154,-128);ctx.quadraticCurveTo(0,-122,-154,-128);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#996618";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-49,-101);ctx.quadraticCurveTo(0,-96,49,-101);ctx.stroke();
  ctx.fillStyle="#f7d76b";roundedRect(-15,-108,30,5,2,"#f7d76b");
  // Twin vertically stacked tail lamps with bright red lenses and amber indicators.
  for(const sideSign of [-1,1]){
    const lx=sideSign*132;
    roundedRect(lx-13,-171,26,61,9,"#672a22","#eed087");
    roundedRect(lx-9,-165,18,27,7,"#e13a35");
    roundedRect(lx-9,-133,18,15,5,"#ffc45b");
    roundedRect(lx-9,-115,18,10,4,"#d83832");
    ctx.fillStyle="rgba(255,111,75,.26)";ctx.shadowColor="#ff554a";ctx.shadowBlur=19;ctx.beginPath();ctx.ellipse(lx,-151,13,24,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  }
  // Registration plate centered on the boot and a substantial chrome bumper.
  roundedRect(-55,-91,110,28,4,"#d9d2bd","#f8efce");
  ctx.fillStyle="#172126";ctx.font="bold 13px 'DM Mono',monospace";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("WB 19 A 7055",0,-77);
  const chrome=ctx.createLinearGradient(0,-65,0,-37);chrome.addColorStop(0,"#f7f0d3");chrome.addColorStop(.24,"#78807e");chrome.addColorStop(.52,"#e2dcc7");chrome.addColorStop(1,"#535a5a");
  ctx.strokeStyle=chrome;ctx.lineWidth=12;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-162,-57);ctx.quadraticCurveTo(0,-36,162,-57);ctx.stroke();
  ctx.strokeStyle="#fff5d0";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-152,-65);ctx.quadraticCurveTo(0,-45,152,-65);ctx.stroke();
  // Small illuminated Ambassador taxi board above the curved roof.
  roundedRect(-31,-287,62,18,6,"#e9b72f","#fff0a6");ctx.fillStyle="#49310d";ctx.font="bold 8px 'DM Mono',monospace";ctx.textAlign="center";ctx.fillText("TAXI",0,-278);
  if(state.brake){
    ctx.save();ctx.globalCompositeOperation="lighter";
    for(const lx of [-132,132]){
      const glow=ctx.createRadialGradient(lx,-151,1,lx,-151,34);glow.addColorStop(0,"rgba(255,48,38,.7)");glow.addColorStop(.35,"rgba(255,30,24,.32)");glow.addColorStop(1,"rgba(255,20,20,0)");
      ctx.fillStyle=glow;ctx.fillRect(lx-34,-185,68,68);
    }
    ctx.restore();
  }
  ctx.restore();
}
function drawCockpit(w,h) {
  if(hasImg("dash_driver")){
    const image=IMG.dash_driver,drawW=w,drawH=drawW*image.naturalHeight/image.naturalWidth;
    ctx.drawImage(image,0,h-drawH,drawW,drawH);
    drawWindshieldDrops(w,h*.69);
    drawWindshieldWipers(w,h);
    return;
  }
  const base=h*.73;
  // Dark padded roof, with a broad, curved windshield opening.
  polygon([[0,0],[w,0],[w*.94,h*.08],[w*.82,h*.105],[w*.18,h*.105],[w*.06,h*.08]],"#090d13");
  // Windscreen pillars and deep charcoal right-hand-drive dashboard.
  polygon([[0,0],[w*.055,h*.06],[w*.17,base],[0,base]],"#10141a");
  polygon([[w,0],[w*.945,h*.06],[w*.83,base],[w,base]],"#10141a");
  const dash=ctx.createLinearGradient(0,base,0,h);dash.addColorStop(0,"#242a27");dash.addColorStop(.18,"#111718");dash.addColorStop(1,"#080c0e");
  polygon([[0,base],[w*.18,base-.035*h],[w*.82,base-.035*h],[w,base],[w,h],[0,h]],dash,"#3e4540",2);
  // Twin side mirrors on the right-hand-drive cab.
  for(const side of [-1,1]){
    const mx=side<0?w*.09:w*.91,my=h*.34;
    ctx.strokeStyle="#1b2424";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(side<0?w*.16:w*.84,my+18);ctx.lineTo(mx,my+3);ctx.stroke();
    roundedRect(mx-w*.034,my-13,w*.068,31,10,"#202a29","#88918a");roundedRect(mx-w*.027,my-8,w*.054,20,7,"#71817e");
    ctx.strokeStyle="rgba(240,233,205,.42)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(mx-w*.02,my-5);ctx.lineTo(mx+w*.02,my+5);ctx.stroke();
  }
  // Curved rear-view mirror and rain wiper sweep, visible against the city view.
  roundedRect(w*.445,h*.105,w*.11,h*.035,9,"#10171a","#5d6867");
  drawWindshieldWipers(w,h);
  drawWindshieldDrops(w,h*.69);
  ctx.strokeStyle="rgba(226,237,238,.1)";ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(w*.29,h*.26);ctx.quadraticCurveTo(w*.52,h*.31,w*.73,h*.23);ctx.stroke();
  // Instrument binnacle, speed dial, and a fare meter placeholder for M2.
  roundedRect(w*.08,base+.035*h,w*.23,.17*h,12,"#0a1013","#7a765f");
  ctx.fillStyle="#d8bb68";ctx.font=`bold ${Math.max(11,w*.01)}px 'DM Mono',monospace`;ctx.textAlign="left";ctx.fillText("CALCUTTA TAXI FARE METER",w*.1,base+.078*h);
  ctx.fillStyle="#ffc953";ctx.font=`bold ${Math.max(19,w*.026)}px 'DM Mono',monospace`;ctx.fillText("\u20B9  0.00",w*.1,base+.15*h);
  ctx.fillStyle="#8ce2b0";ctx.font=`${Math.max(9,w*.009)}px 'DM Mono',monospace`;ctx.fillText("READY FOR HIRE",w*.1,base+.185*h);
  roundedRect(w*.38,base+.035*h,w*.17,.14*h,12,"#0d1415","#65716a");
  ctx.fillStyle="#8ce2b0";ctx.font=`bold ${Math.max(12,w*.012)}px 'DM Mono',monospace`;ctx.textAlign="center";ctx.fillText("SPEEDOMETER",w*.465,base+.079*h);
  ctx.fillStyle="#f1f0dc";ctx.font=`bold ${Math.max(20,w*.025)}px 'DM Mono',monospace`;ctx.fillText(`${Math.round(Math.abs(state.speed)*.92)} km/h`,w*.465,base+.14*h);
  ctx.save();ctx.translate(w*.78,base+.12*h);
  ctx.fillStyle="#111719";ctx.beginPath();ctx.arc(0,0,w*.055,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#a6a078";ctx.lineWidth=3;ctx.stroke();
  ctx.strokeStyle="#e7c55f";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w*.025,-w*.02);ctx.stroke();
  ctx.fillStyle="#f2d994";ctx.font=`${Math.max(9,w*.008)}px 'DM Mono',monospace`;ctx.textAlign="center";ctx.fillText("km/h",0,w*.035);ctx.restore();
  // Steering wheel sits low and to the driver's right, matching the Indian RHD layout.
  const sx=w*.79,sy=h*.84,r=Math.min(w,h)*.095;
  ctx.save();ctx.translate(sx,sy);ctx.rotate(state.steer*.18);
  ctx.strokeStyle="#090d0d";ctx.lineWidth=14;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle="#707872";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r-7,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle="#707872";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-r+5);ctx.moveTo(0,0);ctx.lineTo(-r*.75,r*.52);ctx.moveTo(0,0);ctx.lineTo(r*.75,r*.52);ctx.stroke();
  ctx.fillStyle="#202826";ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();ctx.restore();
  // Small wooden beads and a brass dashboard idol.
  ctx.strokeStyle="#b99c58";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.5,0);ctx.lineTo(w*.5,h*.14);ctx.stroke();
  for(let i=0;i<5;i++){ctx.fillStyle="#8b6636";ctx.beginPath();ctx.arc(w*.5,h*.025+i*8,3,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle="#d5a848";ctx.beginPath();ctx.arc(w*.48,base-.012*h,8,0,Math.PI*2);ctx.fill();
}
function drawWindshieldWipers(w,h) {
  const phase=(state.elapsed%1.8)/1.8;
  const sweep=Math.sin(phase*Math.PI*2)*.54;
  const pivots=[{x:w*.31,y:h*.70,angle:-.56+sweep},{x:w*.69,y:h*.70,angle:Math.PI+.56-sweep}];
  ctx.save();ctx.lineCap="round";
  pivots.forEach(p=>{
    const length=w*.27,ex=p.x+Math.cos(p.angle)*length,ey=p.y+Math.sin(p.angle)*length;
    ctx.strokeStyle="rgba(3,8,12,.62)";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(ex,ey);ctx.stroke();
    ctx.strokeStyle="rgba(195,207,205,.7)";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(ex,ey);ctx.stroke();
  });
  ctx.restore();
}
function drawWindshieldDrops(w,horizon) {
  ctx.save();
  polygon([[w*.08,h*.06],[w*.92,h*.06],[w*.83,horizon],[w*.17,horizon]],"rgba(0,0,0,0)");
  ctx.clip();
  for(let i=0;i<14;i++){
    const x=((i*173+Math.sin(state.elapsed*.55+i)*23)%w+w)%w;
    const y=h*.11+((i*89+state.elapsed*21)%(horizon*.78));
    const radius=1.5+(i%4)*.7;
    ctx.fillStyle=`rgba(205,224,228,${.12+(i%3)*.06})`;ctx.beginPath();ctx.ellipse(x,y,radius*.72,radius*1.35,-.2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="rgba(218,233,234,.19)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y+radius);ctx.lineTo(x-2,y+radius+5+(i%3)*3);ctx.stroke();
  }
  ctx.restore();
}
function drawRain(w,h) {
  ctx.save();ctx.lineWidth=1;
  for(const d of state.rain){ctx.strokeStyle=`rgba(195,215,222,${d.opacity})`;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-d.slant,d.y+d.length);ctx.stroke();}
  // Rain glow around distant lamps.
  const glow=ctx.createRadialGradient(w*.5,h*.48,2,w*.5,h*.48,w*.38);glow.addColorStop(0,"rgba(219,170,93,.065)");glow.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  // Subtle color wash reduces saturation without dimming the roadway details.
  ctx.globalCompositeOperation="saturation";ctx.fillStyle="rgba(128,128,128,.12)";ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation="source-over";
  const vignette=ctx.createRadialGradient(w*.5,h*.47,Math.min(w,h)*.28,w*.5,h*.47,Math.max(w,h)*.78);
  vignette.addColorStop(0,"rgba(2,7,12,0)");vignette.addColorStop(.72,"rgba(2,7,12,.13)");vignette.addColorStop(1,"rgba(1,4,8,.62)");ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  ctx.restore();
}
function syncHud() {
  const remainingUnits=state.trip
    ? state.trip.destinationS-state.distance
    : state.passenger ? state.passenger.s-state.distance : null;
  if(ui.distRemaining)ui.distRemaining.textContent=remainingUnits===null?"-- m":`${Math.max(0,remainingUnits/CONFIG.worldUnitsPerGameMetre).toFixed(0)} m`;
  if(ui.passengerCard){
    const active=state.trip||state.passenger;
    ui.passengerCard.hidden=!active;
    if(active){
      ui.passengerName.textContent=active.name.toUpperCase();
      ui.passengerDestination.textContent=active.destination;
      ui.passengerQuote.textContent=state.trip?"\u201cDada, please take the Strand Road route.\u201d":"\u201cDada, please stop by the curb.\u201d";
      ui.passengerCard.querySelector(".passenger-kicker").textContent=state.trip?"PASSENGER ON BOARD \u00B7 FARE ACTIVE":"PASSENGER HAIL \u00B7 PARK STREET";
    }
  }
  state.wanted=clamp(state.wanted,0,3);
  if(ui.wantedStars){
    [...ui.wantedStars.children].forEach((star,index)=>star.classList.toggle("filled",index<state.wanted));
    ui.wantedStars.setAttribute("aria-label",`${state.wanted} of 3 wanted stars`);
    ui.wantedStatus.textContent=state.wanted===0?"WANTED LEVEL: 0/3 \u00B7 CLEAN RECORD":`WANTED LEVEL: ${state.wanted}/3`;
  }
  const moving=Math.abs(state.speed);
  state.rpm=Math.round(clamp((state.reverse?850:moving<1?780:1050)+moving*25,700,6000));
  if(ui.rpmValue)ui.rpmValue.textContent=String(state.rpm);
  if(ui.rpmBar)ui.rpmBar.style.width=`${clamp(state.rpm/6000*100,0,100)}%`;
}
function drawMinimap() {
  if(!minimapCtx||!minimap)return;
  const c=minimapCtx,w=minimap.width,h=minimap.height;c.clearRect(0,0,w,h);
  const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,"#0d1b28");bg.addColorStop(1,"#071019");c.fillStyle=bg;c.fillRect(0,0,w,h);
  c.strokeStyle="rgba(209,176,101,.13)";c.lineWidth=1;
  for(let i=1;i<4;i++){c.beginPath();c.moveTo(8,i*h/4);c.lineTo(w-8,i*h/4);c.stroke();}
  c.lineCap="round";c.lineWidth=26;c.strokeStyle="#26333a";c.beginPath();c.moveTo(w*.54,7);c.lineTo(w*.49,h-7);c.stroke();
  c.lineWidth=1;c.strokeStyle="#cfb75f";c.setLineDash([4,5]);c.beginPath();c.moveTo(w*.54,7);c.lineTo(w*.49,h-7);c.stroke();c.setLineDash([]);
  const playerY=h*.73,range=2600;
  c.fillStyle="#f4c44f";c.shadowColor="#ffcb56";c.shadowBlur=8;c.beginPath();c.arc(w*.49,playerY,5,0,Math.PI*2);c.fill();c.shadowBlur=0;
  function pin(y,color){c.save();c.translate(w*.54,clamp(y,8,h-10));c.fillStyle=color;c.shadowColor=color;c.shadowBlur=7;c.beginPath();c.arc(0,-3,4,Math.PI,0);c.lineTo(0,7);c.closePath();c.fill();c.restore();}
  if(state.passenger)pin(playerY-(state.passenger.s-state.distance)/range*(h*.64),"#ffd052");
  if(state.trip)pin(playerY-(state.trip.destinationS-state.distance)/range*(h*.64),"#55e3ab");
}
function draw() {
  const w=state.width,h=state.height,view=state.camera;
  ctx.save();
  if(state.shake>0)ctx.translate((Math.random()-.5)*state.shake,(Math.random()-.5)*state.shake);
  const world=drawWorld(w,h,view);
  if(view==="chase"){
    const carScale=clamp(Math.min(w/1650,h/920),.72,1.05);
    // Curved reflections stretch toward the bottom of the wet roadway.
    const carX=w*.42+clamp(state.lateral,-1,1)*w*.045;
    for(let i=0;i<8;i++){
      ctx.globalAlpha=.12-i*.012;ctx.fillStyle=i%2?"#c98445":"#9a3430";
      ctx.beginPath();ctx.ellipse(carX+(i-4)*8,h*.88+i*7,48+i*6,6+i*1.5,-.08,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;drawTaxiRear(carX,h*.955,carScale);
    // Roadside lettering is reserved for the code-drawn fallback city.
    if(!hasImg("bridge_mid")){
    ctx.fillStyle="#cfb375";ctx.font="bold 10px Georgia";ctx.textAlign="left";ctx.fillText("\u0995\u09b2\u0995\u09be\u09a4\u09be \u00B7 KOLKATA",w*.07,h*.58);
    roundedRect(w*.82,h*.49,Math.min(114,w*.12),31,5,"#23413e","#d0ab66");ctx.fillStyle="#efd9a2";ctx.font="bold 9px Georgia";ctx.textAlign="center";ctx.fillText("CHA ER DOKAN",w*.88,h*.51+11);
    }
  }else{
    drawCockpit(w,h);
  }
  drawRain(w,h);
  ctx.restore();
}
function frame(now) {
  if(!state.lastTime)state.lastTime=now;
  const dt=Math.min(.04,(now-state.lastTime)/1000);state.lastTime=now;
  if(!state.paused)update(dt);
  syncHud();draw();drawMinimap();requestAnimationFrame(frame);
}
resize();
spawnPassenger(CONFIG.passengerSpawnAheadUnits);
showToast("SHIFT READY", "Use \u2191 or W to drive");
requestAnimationFrame(frame);

