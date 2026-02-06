const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

const layoutSelect = document.getElementById("layout");
const signalSelect = document.getElementById("signalMode");
const densityInput = document.getElementById("density");
const speedInput = document.getElementById("speed");
const densityValue = document.getElementById("densityValue");
const speedValue = document.getElementById("speedValue");
const toggleBtn = document.getElementById("toggle");
const resetBtn = document.getElementById("reset");
const avgSpeedEl = document.getElementById("avgSpeed");
const activeCarsEl = document.getElementById("activeCars");
const pedestriansToggle = document.getElementById("pedestrians");
const publicTransportToggle = document.getElementById("publicTransport");
const incidentsToggle = document.getElementById("incidents");

const state = {
  running: false,
  cars: [],
  ticks: 0,
  signalPhase: 0,
  lastSpawn: 0,
};

const layouts = {
  intersection: {
    roads: [
      { x1: 120, y1: 270, x2: 840, y2: 270 },
      { x1: 480, y1: 60, x2: 480, y2: 480 },
    ],
    spawns: [
      { x: 120, y: 255, vx: 1, vy: 0 },
      { x: 840, y: 285, vx: -1, vy: 0 },
      { x: 465, y: 60, vx: 0, vy: 1 },
      { x: 495, y: 480, vx: 0, vy: -1 },
    ],
    signalPoints: [
      { x: 445, y: 250, dir: "h" },
      { x: 515, y: 290, dir: "h" },
      { x: 470, y: 225, dir: "v" },
      { x: 490, y: 315, dir: "v" },
    ],
  },
  roundabout: {
    roads: [
      { x1: 120, y1: 270, x2: 370, y2: 270 },
      { x1: 590, y1: 270, x2: 840, y2: 270 },
      { x1: 480, y1: 60, x2: 480, y2: 200 },
      { x1: 480, y1: 340, x2: 480, y2: 480 },
    ],
    spawns: [
      { x: 120, y: 255, vx: 1, vy: 0 },
      { x: 840, y: 285, vx: -1, vy: 0 },
      { x: 465, y: 60, vx: 0, vy: 1 },
      { x: 495, y: 480, vx: 0, vy: -1 },
    ],
    roundabout: { x: 480, y: 270, r: 90 },
  },
  tjunction: {
    roads: [
      { x1: 120, y1: 270, x2: 840, y2: 270 },
      { x1: 480, y1: 60, x2: 480, y2: 270 },
    ],
    spawns: [
      { x: 120, y: 255, vx: 1, vy: 0 },
      { x: 840, y: 285, vx: -1, vy: 0 },
      { x: 465, y: 60, vx: 0, vy: 1 },
    ],
    signalPoints: [
      { x: 455, y: 255, dir: "h" },
      { x: 505, y: 285, dir: "h" },
      { x: 470, y: 220, dir: "v" },
    ],
  },
};

function spawnCar() {
  const config = layouts[layoutSelect.value];
  const spawn = config.spawns[Math.floor(Math.random() * config.spawns.length)];
  const busChance = publicTransportToggle.checked ? 0.15 : 0;
  const isBus = Math.random() < busChance;
  state.cars.push({
    x: spawn.x,
    y: spawn.y,
    vx: spawn.vx,
    vy: spawn.vy,
    speed: 1,
    color: isBus ? "#f59e0b" : "#60a5fa",
    size: isBus ? 9 : 6,
  });
}

function updateSignals() {
  if (signalSelect.value === "off") {
    return { h: true, v: true };
  }
  if (signalSelect.value === "manual") {
    return state.signalPhase % 2 === 0 ? { h: true, v: false } : { h: false, v: true };
  }
  const phase = Math.floor((state.ticks / 180) % 2);
  return phase === 0 ? { h: true, v: false } : { h: false, v: true };
}

function updateCars() {
  const speedLimit = Number(speedInput.value);
  const signals = updateSignals();
  const layout = layouts[layoutSelect.value];

  state.cars.forEach((car) => {
    car.speed = Math.min(1.6, speedLimit / 45);
    const stopping = shouldStop(car, layout, signals);
    if (!stopping) {
      car.x += car.vx * car.speed;
      car.y += car.vy * car.speed;
    }
    if (layout.roundabout) {
      adjustRoundabout(car, layout.roundabout);
    }
  });

  state.cars = state.cars.filter((car) => car.x > 60 && car.x < 900 && car.y > 40 && car.y < 500);
}

function shouldStop(car, layout, signals) {
  if (signalSelect.value === "off") {
    return false;
  }
  const atIntersection = Math.abs(car.x - 480) < 30 && Math.abs(car.y - 270) < 30;
  if (!atIntersection) return false;
  if (layout.roundabout) {
    return false;
  }
  if (Math.abs(car.vx) > 0) {
    return !signals.h;
  }
  return !signals.v;
}

function adjustRoundabout(car, roundabout) {
  const dx = car.x - roundabout.x;
  const dy = car.y - roundabout.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < roundabout.r + 8 && distance > roundabout.r - 12) {
    const angle = Math.atan2(dy, dx) + 0.02 * (car.vx >= 0 || car.vy >= 0 ? 1 : -1);
    car.x = roundabout.x + Math.cos(angle) * (roundabout.r + 2);
    car.y = roundabout.y + Math.sin(angle) * (roundabout.r + 2);
    car.vx = -Math.sin(angle);
    car.vy = Math.cos(angle);
  }
}

function drawBackground(layout) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 40;
  ctx.lineCap = "round";
  layout.roads.forEach((road) => {
    ctx.beginPath();
    ctx.moveTo(road.x1, road.y1);
    ctx.lineTo(road.x2, road.y2);
    ctx.stroke();
  });

  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 4;
  layout.roads.forEach((road) => {
    ctx.beginPath();
    ctx.moveTo(road.x1, road.y1);
    ctx.lineTo(road.x2, road.y2);
    ctx.stroke();
  });

  if (layout.roundabout) {
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 48;
    ctx.beginPath();
    ctx.arc(layout.roundabout.x, layout.roundabout.y, layout.roundabout.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(layout.roundabout.x, layout.roundabout.y, layout.roundabout.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawCrossings();
}

function drawCrossings() {
  if (!pedestriansToggle.checked) return;
  ctx.fillStyle = "rgba(226,232,240,0.7)";
  [
    { x: 440, y: 225, w: 80, h: 10 },
    { x: 440, y: 305, w: 80, h: 10 },
    { x: 455, y: 240, w: 10, h: 60 },
    { x: 495, y: 240, w: 10, h: 60 },
  ].forEach((cross) => ctx.fillRect(cross.x, cross.y, cross.w, cross.h));
}

function drawSignals(layout) {
  const signals = updateSignals();
  if (!layout.signalPoints) return;
  layout.signalPoints.forEach((signal) => {
    const allowed = signal.dir === "h" ? signals.h : signals.v;
    ctx.fillStyle = allowed ? "#34d399" : "#ef4444";
    ctx.beginPath();
    ctx.arc(signal.x, signal.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCars() {
  state.cars.forEach((car) => {
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(car.x - car.size, car.y - car.size, car.size * 2, car.size * 2, 4);
    ctx.fill();
  });
}

function drawIncidents() {
  if (!incidentsToggle.checked) return;
  ctx.fillStyle = "rgba(248, 113, 113, 0.4)";
  ctx.beginPath();
  ctx.arc(600, 200, 18, 0, Math.PI * 2);
  ctx.fill();
}

function tick() {
  if (!state.running) return;
  state.ticks += 1;
  if (state.ticks - state.lastSpawn > 60 / Number(densityInput.value)) {
    spawnCar();
    state.lastSpawn = state.ticks;
  }
  updateCars();
  render();
  requestAnimationFrame(tick);
}

function render() {
  const layout = layouts[layoutSelect.value];
  drawBackground(layout);
  drawSignals(layout);
  drawIncidents();
  drawCars();

  const speedLimit = Number(speedInput.value);
  const avgSpeed = state.cars.length ? Math.round(speedLimit * 0.8) : 0;
  avgSpeedEl.textContent = `${avgSpeed} km/h`;
  activeCarsEl.textContent = state.cars.length;
}

function resetSimulation() {
  state.cars = [];
  state.ticks = 0;
  state.lastSpawn = 0;
  render();
}

layoutSelect.addEventListener("change", () => {
  resetSimulation();
});

signalSelect.addEventListener("change", () => {
  if (signalSelect.value === "manual") {
    state.signalPhase = 0;
  }
  render();
});

canvas.addEventListener("click", () => {
  if (signalSelect.value !== "manual") return;
  state.signalPhase += 1;
  render();
});

densityInput.addEventListener("input", () => {
  densityValue.textContent = densityInput.value;
});

speedInput.addEventListener("input", () => {
  speedValue.textContent = `${speedInput.value} km/h`;
});

resetBtn.addEventListener("click", () => {
  resetSimulation();
});

toggleBtn.addEventListener("click", () => {
  state.running = !state.running;
  toggleBtn.textContent = state.running ? "Pauza" : "Start";
  if (state.running) {
    requestAnimationFrame(tick);
  }
});

render();
