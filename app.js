const canvas = document.getElementById("road");
const ctx = canvas.getContext("2d");

const densityInput = document.getElementById("density");
const maxSpeedInput = document.getElementById("maxSpeed");
const slowdownInput = document.getElementById("slowdown");
const bottleneckInput = document.getElementById("bottleneck");
const densityValue = document.getElementById("densityValue");
const maxSpeedValue = document.getElementById("maxSpeedValue");
const slowdownValue = document.getElementById("slowdownValue");
const bottleneckValue = document.getElementById("bottleneckValue");
const avgSpeedEl = document.getElementById("avgSpeed");
const slowCarsEl = document.getElementById("slowCars");
const toggleBtn = document.getElementById("toggle");
const resetBtn = document.getElementById("reset");

const road = {
  length: 1200,
  laneWidth: 70,
  radiusX: 300,
  radiusY: 180,
};
const bottleneck = {
  start: 0.08,
  length: 0.16,
};

let cars = [];
let running = true;
let lastTime = performance.now();

function createCars(count) {
  const spacing = road.length / count;
  return Array.from({ length: count }, (_, index) => ({
    position: index * spacing,
    speed: 8 + Math.random() * 2,
    colorHue: 190 + Math.random() * 90,
  }));
}

function resetSimulation() {
  cars = createCars(Number(densityInput.value));
}

function updateStats() {
  const avgSpeed = cars.reduce((sum, car) => sum + car.speed, 0) / cars.length;
  const slowCars = cars.filter((car) => car.speed < 3).length;
  avgSpeedEl.textContent = avgSpeed.toFixed(1) + " m/s";
  slowCarsEl.textContent = slowCars.toString();
}

function updateCarSpeeds(delta) {
  const maxSpeed = Number(maxSpeedInput.value);
  const slowdownChance = Number(slowdownInput.value);
  const bottleneckStrength = Number(bottleneckInput.value);
  const minGap = 18;
  const accel = 7;
  const decel = 14;

  cars.sort((a, b) => a.position - b.position);

  for (let i = 0; i < cars.length; i += 1) {
    const car = cars[i];
    const nextCar = cars[(i + 1) % cars.length];
    let gap = nextCar.position - car.position - 12;
    if (gap < 0) {
      gap += road.length;
    }

    const desiredSpeed = isInBottleneck(car.position)
      ? maxSpeed * (1 - bottleneckStrength)
      : maxSpeed;
    if (gap < minGap) {
      car.speed = Math.max(0, car.speed - decel * delta);
    } else if (car.speed < desiredSpeed) {
      car.speed = Math.min(desiredSpeed, car.speed + accel * delta);
    }

    if (Math.random() < slowdownChance * delta && car.speed > 2) {
      car.speed = Math.max(0, car.speed - 8 * delta);
    }
  }
}

function updatePositions(delta) {
  cars.forEach((car) => {
    car.position = (car.position + car.speed * 10 * delta) % road.length;
  });
}

function drawRoad() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(centerX, centerY);

  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = road.laneWidth;
  ctx.beginPath();
  ctx.ellipse(0, 0, road.radiusX, road.radiusY, 0, 0, Math.PI * 2);
  ctx.stroke();

  drawBottleneckZone();

  ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
  ctx.setLineDash([12, 14]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, road.radiusX, road.radiusY, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

function drawBottleneckZone() {
  const startAngle = bottleneck.start * Math.PI * 2;
  const endAngle = (bottleneck.start + bottleneck.length) * Math.PI * 2;
  ctx.save();
  ctx.strokeStyle = "rgba(248, 113, 113, 0.8)";
  ctx.lineWidth = road.laneWidth;
  ctx.beginPath();
  ctx.ellipse(0, 0, road.radiusX, road.radiusY, 0, startAngle, endAngle);
  ctx.stroke();
  ctx.restore();
}

function isInBottleneck(position) {
  const start = bottleneck.start * road.length;
  const end = (bottleneck.start + bottleneck.length) * road.length;
  return position >= start && position <= end;
}

function drawCars() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  cars.forEach((car) => {
    const angle = (car.position / road.length) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * road.radiusX;
    const y = centerY + Math.sin(angle) * road.radiusY;

    const speedRatio = Math.max(0, Math.min(1, car.speed / Number(maxSpeedInput.value)));
    const lightness = 40 + speedRatio * 30;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = `hsl(${car.colorHue}, 80%, ${lightness}%)`;
    ctx.fillRect(-6, -10, 12, 22);
    ctx.restore();
  });
}

function tick(timestamp) {
  const delta = Math.min(0.05, (timestamp - lastTime) / 1000);
  lastTime = timestamp;

  if (running) {
    updateCarSpeeds(delta);
    updatePositions(delta);
  }

  drawRoad();
  drawCars();
  updateStats();

  requestAnimationFrame(tick);
}

function syncControls() {
  densityValue.textContent = densityInput.value;
  maxSpeedValue.textContent = maxSpeedInput.value;
  slowdownValue.textContent = slowdownInput.value;
  bottleneckValue.textContent = bottleneckInput.value;
}

[densityInput, maxSpeedInput, slowdownInput, bottleneckInput].forEach((input) => {
  input.addEventListener("input", () => {
    syncControls();
    if (input === densityInput) {
      resetSimulation();
    }
  });
});

toggleBtn.addEventListener("click", () => {
  running = !running;
  toggleBtn.textContent = running ? "Pauza" : "Wznów";
});

resetBtn.addEventListener("click", () => {
  resetSimulation();
});

syncControls();
resetSimulation();
requestAnimationFrame(tick);
