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

const laneWidth = 14;
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
      { orientation: "h", center: 270, start: 120, end: 840, lanes: 2 },
      { orientation: "v", center: 480, start: 60, end: 480, lanes: 2 },
    ],
    signalPoints: [
      { x: 440, y: 250, dir: "h" },
      { x: 520, y: 290, dir: "h" },
      { x: 468, y: 230, dir: "v" },
      { x: 492, y: 310, dir: "v" },
    ],
  },
  roundabout: {
    roads: [
      { orientation: "h", center: 270, start: 120, end: 380, lanes: 2 },
      { orientation: "h", center: 270, start: 580, end: 840, lanes: 2 },
      { orientation: "v", center: 480, start: 60, end: 210, lanes: 2 },
      { orientation: "v", center: 480, start: 330, end: 480, lanes: 2 },
    ],
    roundabout: { x: 480, y: 270, r: 95, lanes: 2 },
  },
  tjunction: {
    roads: [
      { orientation: "h", center: 270, start: 120, end: 840, lanes: 2 },
      { orientation: "v", center: 480, start: 60, end: 270, lanes: 2 },
    ],
    signalPoints: [
      { x: 448, y: 250, dir: "h" },
      { x: 512, y: 290, dir: "h" },
      { x: 480, y: 228, dir: "v" },
    ],
  },
  arterial: {
    roads: [
      { orientation: "h", center: 250, start: 80, end: 880, lanes: 3 },
      { orientation: "h", center: 330, start: 120, end: 840, lanes: 2 },
      { orientation: "v", center: 360, start: 80, end: 500, lanes: 2 },
      { orientation: "v", center: 600, start: 40, end: 460, lanes: 3 },
    ],
    signalPoints: [
      { x: 350, y: 240, dir: "h" },
      { x: 610, y: 260, dir: "h" },
      { x: 370, y: 305, dir: "v" },
      { x: 590, y: 305, dir: "v" },
    ],
  },
};

function buildSpawns(layout) {
  const spawns = [];
  layout.roads.forEach((road) => {
    for (let laneIndex = 0; laneIndex < road.lanes; laneIndex += 1) {
      spawns.push(createSpawn(road, 1, laneIndex));
      spawns.push(createSpawn(road, -1, laneIndex));
    }
  });
  return spawns;
}

function createSpawn(road, dir, laneIndex) {
  const laneOffset = getLaneOffset(road.orientation, dir, laneIndex);
  if (road.orientation === "h") {
    return {
      x: dir === 1 ? road.start : road.end,
      y: road.center + laneOffset,
      vx: dir,
      vy: 0,
      orientation: "h",
      dir,
      laneIndex,
      lanes: road.lanes,
    };
  }
  return {
    x: road.center + laneOffset,
    y: dir === 1 ? road.start : road.end,
    vx: 0,
    vy: dir,
    orientation: "v",
    dir,
    laneIndex,
    lanes: road.lanes,
  };
}

function getLaneOffset(orientation, dir, laneIndex) {
  const offset = (laneIndex + 0.5) * laneWidth;
  if (orientation === "h") {
    return dir === 1 ? -offset : offset;
  }
  return dir === 1 ? offset : -offset;
}

function spawnCar() {
  const config = layouts[layoutSelect.value];
  config.spawns = config.spawns || buildSpawns(config);
  const spawn = config.spawns[Math.floor(Math.random() * config.spawns.length)];
  const busChance = publicTransportToggle.checked ? 0.18 : 0;
  const isBus = Math.random() < busChance;
  state.cars.push({
    x: spawn.x,
    y: spawn.y,
    vx: spawn.vx,
    vy: spawn.vy,
    orientation: spawn.orientation,
    dir: spawn.dir,
    laneIndex: spawn.laneIndex,
    lanes: spawn.lanes,
    speed: 1,
    baseSpeed: 1,
    color: isBus ? "#f59e0b" : "#60a5fa",
    size: isBus ? 9 : 6,
    id: crypto.randomUUID(),
  });
}

function updateSignals() {
  if (signalSelect.value === "off") {
    return { h: true, v: true };
  }
  if (signalSelect.value === "manual") {
    return state.signalPhase % 2 === 0 ? { h: true, v: false } : { h: false, v: true };
  }
  const phase = Math.floor((state.ticks / 200) % 2);
  return phase === 0 ? { h: true, v: false } : { h: false, v: true };
}

function updateCars() {
  const speedLimit = Number(speedInput.value);
  const signals = updateSignals();
  const layout = layouts[layoutSelect.value];

  state.cars.forEach((car) => {
    car.baseSpeed = Math.min(2.1, speedLimit / 40);
  });

  state.cars.forEach((car) => {
    const stopping = shouldStop(car, layout, signals);
    const leadDistance = getLeadDistance(car, state.cars);
    const minGap = car.size * 2.6;
    const slowGap = car.size * 5;

    if (stopping || leadDistance < minGap) {
      car.speed = 0;
    } else if (leadDistance < slowGap) {
      car.speed = car.baseSpeed * 0.35;
    } else {
      car.speed = car.baseSpeed;
    }

    const nextX = car.x + car.vx * car.speed;
    const nextY = car.y + car.vy * car.speed;
    const safeMove = !willCollide(car, nextX, nextY, state.cars);

    if (safeMove) {
      car.x = nextX;
      car.y = nextY;
    }

    if (layout.roundabout) {
      adjustRoundabout(car, layout.roundabout, state.cars);
    }
  });

  state.cars = state.cars.filter((car) => car.x > 40 && car.x < 920 && car.y > 30 && car.y < 510);
}

function getLeadDistance(car, cars) {
  const sameLane = cars.filter(
    (other) =>
      other !== car &&
      other.orientation === car.orientation &&
      other.dir === car.dir &&
      other.laneIndex === car.laneIndex,
  );
  if (!sameLane.length) return Number.POSITIVE_INFINITY;

  if (car.orientation === "h") {
    const candidates = sameLane.filter((other) => (car.dir === 1 ? other.x > car.x : other.x < car.x));
    if (!candidates.length) return Number.POSITIVE_INFINITY;
    const lead = candidates.reduce((prev, curr) =>
      Math.abs(curr.x - car.x) < Math.abs(prev.x - car.x) ? curr : prev,
    );
    return Math.abs(lead.x - car.x);
  }

  const candidates = sameLane.filter((other) => (car.dir === 1 ? other.y > car.y : other.y < car.y));
  if (!candidates.length) return Number.POSITIVE_INFINITY;
  const lead = candidates.reduce((prev, curr) =>
    Math.abs(curr.y - car.y) < Math.abs(prev.y - car.y) ? curr : prev,
  );
  return Math.abs(lead.y - car.y);
}

function willCollide(car, nextX, nextY, cars) {
  const buffer = car.size * 2.4;
  return cars.some((other) => {
    if (other === car) return false;
    const dx = other.x - nextX;
    const dy = other.y - nextY;
    return Math.hypot(dx, dy) < buffer + other.size;
  });
}

function shouldStop(car, layout, signals) {
  if (signalSelect.value === "off") {
    return false;
  }
  if (layout.roundabout) {
    return false;
  }
  const atIntersection = Math.abs(car.x - 480) < 35 && Math.abs(car.y - 270) < 35;
  if (!atIntersection) return false;

  if (car.orientation === "h") {
    return !signals.h;
  }
  return !signals.v;
}

function adjustRoundabout(car, roundabout, cars) {
  const dx = car.x - roundabout.x;
  const dy = car.y - roundabout.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const ringRadius = roundabout.r + (car.laneIndex % roundabout.lanes) * laneWidth * 0.7;
  if (distance < ringRadius + 10 && distance > ringRadius - 12) {
    const angle = Math.atan2(dy, dx) + 0.018 * (car.vx >= 0 || car.vy >= 0 ? 1 : -1);
    const nextX = roundabout.x + Math.cos(angle) * ringRadius;
    const nextY = roundabout.y + Math.sin(angle) * ringRadius;
    if (!willCollide(car, nextX, nextY, cars)) {
      car.x = nextX;
      car.y = nextY;
      car.vx = -Math.sin(angle);
      car.vy = Math.cos(angle);
    }
  }
}

function drawBackground(layout) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#0f172a");
  gradient.addColorStop(1, "#111827");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  layout.roads.forEach((road) => drawRoad(road));

  if (layout.roundabout) {
    drawRoundabout(layout.roundabout);
  }

  drawCrossings();
}

function drawRoad(road) {
  const totalLanes = road.lanes * 2;
  const roadWidth = totalLanes * laneWidth + 12;
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = roadWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (road.orientation === "h") {
    ctx.moveTo(road.start, road.center);
    ctx.lineTo(road.end, road.center);
  } else {
    ctx.moveTo(road.center, road.start);
    ctx.lineTo(road.center, road.end);
  }
  ctx.stroke();

  ctx.strokeStyle = "#0b1220";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (road.orientation === "h") {
    ctx.moveTo(road.start, road.center - roadWidth / 2 + 4);
    ctx.lineTo(road.end, road.center - roadWidth / 2 + 4);
    ctx.moveTo(road.start, road.center + roadWidth / 2 - 4);
    ctx.lineTo(road.end, road.center + roadWidth / 2 - 4);
  } else {
    ctx.moveTo(road.center - roadWidth / 2 + 4, road.start);
    ctx.lineTo(road.center - roadWidth / 2 + 4, road.end);
    ctx.moveTo(road.center + roadWidth / 2 - 4, road.start);
    ctx.lineTo(road.center + roadWidth / 2 - 4, road.end);
  }
  ctx.stroke();

  ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  for (let i = 1; i < totalLanes; i += 1) {
    const offset = (i - totalLanes / 2) * laneWidth;
    ctx.beginPath();
    if (road.orientation === "h") {
      ctx.moveTo(road.start, road.center + offset);
      ctx.lineTo(road.end, road.center + offset);
    } else {
      ctx.moveTo(road.center + offset, road.start);
      ctx.lineTo(road.center + offset, road.end);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawRoundabout(roundabout) {
  const outerRadius = roundabout.r + laneWidth * roundabout.lanes * 0.6;
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = laneWidth * roundabout.lanes * 2 + 12;
  ctx.beginPath();
  ctx.arc(roundabout.x, roundabout.y, outerRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(roundabout.x, roundabout.y, outerRadius - laneWidth * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCrossings() {
  if (!pedestriansToggle.checked) return;
  ctx.fillStyle = "rgba(226,232,240,0.7)";
  [
    { x: 430, y: 222, w: 100, h: 12 },
    { x: 430, y: 306, w: 100, h: 12 },
    { x: 456, y: 232, w: 12, h: 76 },
    { x: 494, y: 232, w: 12, h: 76 },
  ].forEach((cross) => ctx.fillRect(cross.x, cross.y, cross.w, cross.h));
}

function drawSignals(layout) {
  const signals = updateSignals();
  if (!layout.signalPoints) return;
  layout.signalPoints.forEach((signal) => {
    const allowed = signal.dir === "h" ? signals.h : signals.v;
    ctx.fillStyle = allowed ? "#34d399" : "#ef4444";
    ctx.beginPath();
    ctx.arc(signal.x, signal.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCars() {
  state.cars.forEach((car) => {
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(car.x - car.size, car.y - car.size, car.size * 2, car.size * 2, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
    ctx.beginPath();
    ctx.roundRect(car.x - car.size + 2, car.y - car.size + 2, car.size * 1.3, car.size * 1.1, 3);
    ctx.fill();
  });
}

function drawIncidents() {
  if (!incidentsToggle.checked) return;
  ctx.fillStyle = "rgba(248, 113, 113, 0.35)";
  ctx.beginPath();
  ctx.arc(620, 210, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(248, 113, 113, 0.8)";
  ctx.lineWidth = 2;
  ctx.stroke();
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
  const avgSpeed = state.cars.length ? Math.round(speedLimit * 0.78) : 0;
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
