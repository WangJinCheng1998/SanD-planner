if (window.lucide) {
  window.lucide.createIcons();
}

const siteHeader = document.querySelector(".site-header");

if (siteHeader) {
  let headerTicking = false;

  function updateHeaderState() {
    siteHeader.classList.toggle("is-condensed", window.scrollY > 80);
    headerTicking = false;
  }

  updateHeaderState();
  window.addEventListener(
    "scroll",
    () => {
      if (headerTicking) return;
      headerTicking = true;
      window.requestAnimationFrame(updateHeaderState);
    },
    { passive: true },
  );
}

const copyButton = document.querySelector("#copyBibtex");
const bibtex = document.querySelector("#bibtex");

copyButton?.addEventListener("click", async () => {
  if (!bibtex) return;

  try {
    await navigator.clipboard.writeText(bibtex.textContent.trim());
    const original = copyButton.innerHTML;
    copyButton.innerHTML = '<i data-lucide="check" aria-hidden="true"></i>Copied';
    if (window.lucide) {
      window.lucide.createIcons();
    }
    window.setTimeout(() => {
      copyButton.innerHTML = original;
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }, 1600);
  } catch {
    copyButton.textContent = "Copy failed";
  }
});

const introSection = document.querySelector("#abstract.intro");
const sandCanvas = document.querySelector(".sand-canvas");

if (introSection && sandCanvas) {
  const ctx = sandCanvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let avoidRects = [];
  let lastTime = 0;
  let sandAnimationFrame = 0;
  let isSandVisible = true;

  const colors = [
    [126, 111, 78],
    [162, 141, 98],
    [194, 178, 138],
    [218, 205, 168],
    [188, 205, 245],
    [153, 160, 202],
  ];

  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function getTextFade(particle) {
    const fadeRadius = particle.kind === "grain" ? 38 : 28;
    let opacity = 1;

    for (const rect of avoidRects) {
      const inside = (
        particle.x > rect.x &&
        particle.x < rect.x + rect.width &&
        particle.y > rect.y &&
        particle.y < rect.y + rect.height
      );

      if (inside) return 0;

      const closestX = clamp(particle.x, rect.x, rect.x + rect.width);
      const closestY = clamp(particle.y, rect.y, rect.y + rect.height);
      const dx = particle.x - closestX;
      const dy = particle.y - closestY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < fadeRadius) {
        opacity = Math.min(opacity, distance / fadeRadius);
      }
    }

    return opacity;
  }

  function makeParticle(initial = false) {
    const fromTop = Math.random() > 0.42;
    const roll = Math.random();
    const kind = roll > 0.24 ? "grain" : "mote";
    const color = colors[Math.floor(Math.random() * colors.length)];
    const startX = fromTop ? random(-width * 0.2, width * 0.96) : random(-130, 12);
    const startY = fromTop ? random(-90, 12) : random(-height * 0.08, height * 0.82);
    const speed = {
      mote: random(1.8, 4.2),
      grain: random(4.8, 10.8),
    }[kind];

    return {
      x: initial ? random(-width * 0.12, width * 1.04) : startX,
      y: initial ? random(-height * 0.12, height * 1.02) : startY,
      size: kind === "grain" ? random(1.15, 2.65) : random(0.62, 1.45),
      speed,
      trail: 0,
      alpha: kind === "grain" ? random(0.34, 0.76) : random(0.18, 0.44),
      phase: random(0, Math.PI * 2),
      wobble: random(0.12, 0.56),
      gravity: random(0.18, 0.46),
      color,
      kind,
    };
  }

  function updateAvoidRects() {
    const sectionRect = introSection.getBoundingClientRect();
    const targets = introSection.querySelectorAll(".section-heading p, .section-body > p");

    avoidRects = Array.from(targets).map((element) => {
      const rect = element.getBoundingClientRect();
      const pad = element.matches("h2") ? 10 : 6;

      return {
        x: rect.left - sectionRect.left - pad,
        y: rect.top - sectionRect.top - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      };
    });
  }

  function resizeCanvas() {
    const rect = introSection.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = 1;
    sandCanvas.width = Math.ceil(width * dpr);
    sandCanvas.height = Math.ceil(height * dpr);
    sandCanvas.style.width = `${width}px`;
    sandCanvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateAvoidRects();

    const count = clamp(Math.floor((width * height) / 760), 780, 1800);
    particles = Array.from({ length: count }, () => makeParticle(true));
  }

  function drawParticle(particle, time, dt) {
    const gust = 1 + Math.max(0, Math.sin(time * 0.0018 + particle.phase)) * 0.9;
    const turbulence = Math.sin(time * 0.008 + particle.phase) * particle.wobble;

    particle.x += (particle.speed * gust + turbulence) * dt;
    particle.y += (particle.speed * 0.42 * gust + particle.gravity + turbulence * 0.4) * dt;

    if (particle.x > width + 120 || particle.y > height + 120) {
      Object.assign(particle, makeParticle(false));
    }

    const [r, g, b] = particle.color;
    const alpha = particle.alpha * getTextFade(particle);
    const size = particle.size;

    if (alpha < 0.01) return;

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.96})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw(time = 0) {
    if (!isSandVisible) {
      sandAnimationFrame = 0;
      return;
    }

    const dt = Math.min(2.2, Math.max(0.6, (time - lastTime) / 16.67 || 1));
    lastTime = time;

    ctx.clearRect(0, 0, width, height);
    particles.forEach((particle) => drawParticle(particle, time, dt));
    sandAnimationFrame = window.requestAnimationFrame(draw);
  }

  function startSandAnimation() {
    if (sandAnimationFrame) return;

    lastTime = performance.now();
    sandAnimationFrame = window.requestAnimationFrame(draw);
  }

  function stopSandAnimation() {
    if (sandAnimationFrame) {
      window.cancelAnimationFrame(sandAnimationFrame);
    }

    sandAnimationFrame = 0;
    ctx.clearRect(0, 0, width, height);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  if ("ResizeObserver" in window) {
    new ResizeObserver(resizeCanvas).observe(introSection);
  }

  if ("IntersectionObserver" in window) {
    isSandVisible = false;

    new IntersectionObserver(
      ([entry]) => {
        isSandVisible = entry.isIntersecting;

        if (isSandVisible) {
          startSandAnimation();
        } else {
          stopSandAnimation();
        }
      },
      { rootMargin: "180px 0px" },
    ).observe(introSection);
  } else {
    startSandAnimation();
  }
}

const splineLabLegacy = null;

if (splineLabLegacy) {
  const svg = splineLab.querySelector(".spline-svg");
  const gridGroup = svg?.querySelector(".spline-grid-lines");
  const obstacleGroup = svg?.querySelector(".spline-obstacles");
  const referencePath = splineLab.querySelector("[data-reference-path]");
  const nearHorizonPath = splineLab.querySelector("[data-near-horizon-path]");
  const ghostGroup = splineLab.querySelector("[data-ghost-curves]");
  const controlPolygon = splineLab.querySelector("[data-control-polygon]");
  const mainCurve = splineLab.querySelector("[data-main-curve]");
  const pointsGroup = splineLab.querySelector("[data-spline-points]");
  const startMarker = splineLab.querySelector("[data-start-marker]");
  const goalMarker = splineLab.querySelector("[data-goal-marker]");
  const modeButtons = splineLab.querySelectorAll("[data-mode]");
  const perturbButton = splineLab.querySelector("[data-perturb]");
  const resetButton = splineLab.querySelector("[data-reset]");
  const modeDescription = splineLab.querySelector("[data-mode-description]");
  const nearDeviation = splineLab.querySelector("[data-near-deviation]");
  const fullDeviation = splineLab.querySelector("[data-full-deviation]");
  const chartLine = splineLab.querySelector("[data-chart-line]");
  const chartFill = splineLab.querySelector("[data-chart-fill]");
  const svgNS = "http://www.w3.org/2000/svg";

  const descriptions = {
    waypoints: "Compact, but not inherently smooth.",
    cubic: "Smooth interpolation, but distal noise can distort the curve globally.",
    bspline: "Smooth control-point representation with local support and stable near-horizon execution.",
  };

  const basePoints = [
    { x: 76, y: 322 },
    { x: 162, y: 288 },
    { x: 248, y: 238 },
    { x: 338, y: 226 },
    { x: 432, y: 190 },
    { x: 522, y: 166 },
    { x: 618, y: 126 },
    { x: 704, y: 96 },
  ];

  let currentMode = "waypoints";
  let points = basePoints.map((point) => ({ ...point }));
  let ghostCurves = [];
  let activePointIndex = null;

  const clampValue = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function createSvgElement(tag, attributes = {}) {
    const element = document.createElementNS(svgNS, tag);

    Object.entries(attributes).forEach(([name, value]) => {
      element.setAttribute(name, String(value));
    });

    return element;
  }

  function pointsToPath(samples) {
    if (!samples.length) return "";

    return samples
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
  }

  function makeStarPath(cx, cy, outer = 13, inner = 6, spikes = 5) {
    const commands = [];

    for (let i = 0; i < spikes * 2; i += 1) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (i * Math.PI) / spikes;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      commands.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }

    return `${commands.join(" ")} Z`;
  }

  function samplePolyline(pointSet, count = 180) {
    const samples = [];
    const lastSegment = pointSet.length - 1;

    for (let i = 0; i < count; i += 1) {
      const scaled = (i / (count - 1)) * lastSegment;
      const segment = Math.min(lastSegment - 1, Math.floor(scaled));
      const local = scaled - segment;
      const start = pointSet[segment];
      const end = pointSet[segment + 1];

      samples.push({
        x: start.x + (end.x - start.x) * local,
        y: start.y + (end.y - start.y) * local,
      });
    }

    return samples;
  }

  function solveNaturalSecondDerivatives(values) {
    const n = values.length;
    const lower = Array(n).fill(0);
    const diag = Array(n).fill(0);
    const upper = Array(n).fill(0);
    const rhs = Array(n).fill(0);

    diag[0] = 1;
    diag[n - 1] = 1;

    for (let i = 1; i < n - 1; i += 1) {
      lower[i] = 1;
      diag[i] = 4;
      upper[i] = 1;
      rhs[i] = 6 * (values[i + 1] - 2 * values[i] + values[i - 1]);
    }

    for (let i = 1; i < n; i += 1) {
      const factor = lower[i] / diag[i - 1];
      diag[i] -= factor * upper[i - 1];
      rhs[i] -= factor * rhs[i - 1];
    }

    const second = Array(n).fill(0);
    second[n - 1] = rhs[n - 1] / diag[n - 1];

    for (let i = n - 2; i >= 0; i -= 1) {
      second[i] = (rhs[i] - upper[i] * second[i + 1]) / diag[i];
    }

    return second;
  }

  function naturalCubicValue(values, second, segment, local) {
    const a = 1 - local;
    const b = local;

    return (
      (second[segment] * a * a * a) / 6 +
      (second[segment + 1] * b * b * b) / 6 +
      (values[segment] - second[segment] / 6) * a +
      (values[segment + 1] - second[segment + 1] / 6) * b
    );
  }

  function sampleNaturalCubic(pointSet, count = 180) {
    const valuesX = pointSet.map((point) => point.x);
    const valuesY = pointSet.map((point) => point.y);
    const secondX = solveNaturalSecondDerivatives(valuesX);
    const secondY = solveNaturalSecondDerivatives(valuesY);
    const samples = [];
    const lastSegment = pointSet.length - 1;

    for (let i = 0; i < count; i += 1) {
      const scaled = (i / (count - 1)) * lastSegment;
      const segment = Math.min(lastSegment - 1, Math.floor(scaled));
      const local = scaled - segment;

      samples.push({
        x: naturalCubicValue(valuesX, secondX, segment, local),
        y: naturalCubicValue(valuesY, secondY, segment, local),
      });
    }

    return samples;
  }

  function makeOpenUniformKnots(pointCount, degree) {
    const n = pointCount - 1;
    const knotCount = n + degree + 2;
    const knots = [];
    const internalCount = n - degree;

    for (let i = 0; i < knotCount; i += 1) {
      if (i <= degree) {
        knots.push(0);
      } else if (i >= knotCount - degree - 1) {
        knots.push(1);
      } else {
        knots.push((i - degree) / (internalCount + 1));
      }
    }

    return knots;
  }

  function deBoor(pointSet, degree, knots, t) {
    const n = pointSet.length - 1;
    let span = degree;

    if (t >= 1) {
      span = n;
    } else {
      for (let i = degree; i <= n; i += 1) {
        if (t >= knots[i] && t < knots[i + 1]) {
          span = i;
          break;
        }
      }
    }

    const d = [];

    for (let j = 0; j <= degree; j += 1) {
      d[j] = { ...pointSet[span - degree + j] };
    }

    for (let r = 1; r <= degree; r += 1) {
      for (let j = degree; j >= r; j -= 1) {
        const left = knots[span - degree + j];
        const right = knots[span + 1 + j - r];
        const alpha = right === left ? 0 : (t - left) / (right - left);

        d[j] = {
          x: (1 - alpha) * d[j - 1].x + alpha * d[j].x,
          y: (1 - alpha) * d[j - 1].y + alpha * d[j].y,
        };
      }
    }

    return d[degree];
  }

  function sampleBSpline(pointSet, count = 180) {
    const degree = 3;
    const knots = makeOpenUniformKnots(pointSet.length, degree);
    const samples = [];

    for (let i = 0; i < count; i += 1) {
      samples.push(deBoor(pointSet, degree, knots, i / (count - 1)));
    }

    return samples;
  }

  function sampleCurve(mode, pointSet, count = 180) {
    if (mode === "cubic") return sampleNaturalCubic(pointSet, count);
    if (mode === "bspline") return sampleBSpline(pointSet, count);
    return samplePolyline(pointSet, count);
  }

  function sampleByArcLength(samples, count) {
    const cumulative = [0];

    for (let i = 1; i < samples.length; i += 1) {
      cumulative.push(cumulative[i - 1] + distance(samples[i], samples[i - 1]));
    }

    const total = cumulative[cumulative.length - 1];
    const fitted = [];

    for (let i = 0; i < count; i += 1) {
      const target = (i / (count - 1)) * total;
      let index = 1;

      while (index < cumulative.length - 1 && cumulative[index] < target) {
        index += 1;
      }

      const previous = samples[index - 1];
      const next = samples[index];
      const span = cumulative[index] - cumulative[index - 1] || 1;
      const local = (target - cumulative[index - 1]) / span;

      fitted.push({
        x: previous.x + (next.x - previous.x) * local,
        y: previous.y + (next.y - previous.y) * local,
      });
    }

    return fitted;
  }

  function bsplineBasis(index, degree, knots, t) {
    if (degree === 0) {
      if (t === 1) {
        return index === knots.length - 2 ? 1 : 0;
      }

      return knots[index] <= t && t < knots[index + 1] ? 1 : 0;
    }

    const leftDenominator = knots[index + degree] - knots[index];
    const rightDenominator = knots[index + degree + 1] - knots[index + 1];
    const left = leftDenominator
      ? ((t - knots[index]) / leftDenominator) * bsplineBasis(index, degree - 1, knots, t)
      : 0;
    const right = rightDenominator
      ? ((knots[index + degree + 1] - t) / rightDenominator) *
        bsplineBasis(index + 1, degree - 1, knots, t)
      : 0;

    return left + right;
  }

  function solveLinearSystem(matrix, rhs) {
    const n = rhs.length;
    const a = matrix.map((row, index) => [...row, rhs[index]]);

    for (let column = 0; column < n; column += 1) {
      let pivot = column;

      for (let row = column + 1; row < n; row += 1) {
        if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) {
          pivot = row;
        }
      }

      [a[column], a[pivot]] = [a[pivot], a[column]];

      const diagonal = a[column][column] || 1e-8;
      for (let entry = column; entry <= n; entry += 1) {
        a[column][entry] /= diagonal;
      }

      for (let row = 0; row < n; row += 1) {
        if (row === column) continue;

        const factor = a[row][column];
        for (let entry = column; entry <= n; entry += 1) {
          a[row][entry] -= factor * a[column][entry];
        }
      }
    }

    return a.map((row) => row[n]);
  }

  function fitBSplineToCurve(samples, controlCount = 8) {
    const degree = 3;
    const knots = makeOpenUniformKnots(controlCount, degree);
    const fixedStart = samples[0];
    const fixedEnd = samples[samples.length - 1];
    const unknownCount = controlCount - 2;
    const normal = Array.from({ length: unknownCount }, () => Array(unknownCount).fill(0));
    const rhsX = Array(unknownCount).fill(0);
    const rhsY = Array(unknownCount).fill(0);

    samples.forEach((sample, sampleIndex) => {
      const t = Math.min(1 - 1e-6, sampleIndex / (samples.length - 1));
      const basis = Array.from({ length: controlCount }, (_, index) => bsplineBasis(index, degree, knots, t));
      const targetX = sample.x - basis[0] * fixedStart.x - basis[controlCount - 1] * fixedEnd.x;
      const targetY = sample.y - basis[0] * fixedStart.y - basis[controlCount - 1] * fixedEnd.y;

      for (let row = 0; row < unknownCount; row += 1) {
        const rowBasis = basis[row + 1];
        rhsX[row] += rowBasis * targetX;
        rhsY[row] += rowBasis * targetY;

        for (let column = 0; column < unknownCount; column += 1) {
          normal[row][column] += rowBasis * basis[column + 1];
        }
      }
    });

    for (let i = 0; i < unknownCount; i += 1) {
      normal[i][i] += 1e-4;
    }

    const fittedX = solveLinearSystem(normal, rhsX);
    const fittedY = solveLinearSystem(normal, rhsY);
    const controls = [{ ...fixedStart }];

    for (let i = 0; i < unknownCount; i += 1) {
      controls.push({ x: fittedX[i], y: fittedY[i] });
    }

    controls.push({ ...fixedEnd });
    return controls;
  }

  function clonePointSets(source) {
    return Object.fromEntries(
      modes.map((mode) => [mode, source[mode].map((point) => ({ ...point }))]),
    );
  }

  function makeBasePointSets() {
    gtSamples = sampleNaturalCubic(gtAnchors, 240);
    referencePathData = pointsToPath(gtSamples);
    const interpolatedFit = sampleByArcLength(gtSamples, 8);

    return {
      waypoints: interpolatedFit.map((point) => ({ ...point })),
      cubic: interpolatedFit.map((point) => ({ ...point })),
      bspline: fitBSplineToCurve(gtSamples, 8),
    };
  }

  function makeDistalOffsets(radius = 58) {
    return Array.from({ length: 3 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const length = Math.sqrt(Math.random()) * radius;

      return {
        x: Math.cos(angle) * length,
        y: Math.sin(angle) * length,
      };
    });
  }

  function applyDistalOffsets(baseSet, offsets) {
    const next = baseSet.map((point) => ({ ...point }));
    const firstDistalIndex = next.length - offsets.length;

    offsets.forEach((offset, offsetIndex) => {
      const index = firstDistalIndex + offsetIndex;
      const base = baseSet[index];

      next[index] = {
        x: clampValue(base.x + offset.x, 42, 724),
        y: clampValue(base.y + offset.y, 62, 366),
      };
    });

    return next;
  }

  function drawStaticScene() {
    if (!gridGroup || !obstacleGroup || !referencePath || !startMarker || !goalMarker) return;

    gridGroup.innerHTML = "";
    obstacleGroup.innerHTML = "";

    for (let x = 80; x < 760; x += 80) {
      gridGroup.append(createSvgElement("line", { x1: x, y1: 32, x2: x, y2: 398 }));
    }

    for (let y = 70; y < 430; y += 70) {
      gridGroup.append(createSvgElement("line", { x1: 30, y1: y, x2: 732, y2: y }));
    }

    [
      "212,314 276,286 298,338 244,370",
      "384,118 452,86 502,128 474,184 404,174",
      "560,246 630,224 674,270 636,326 574,308",
    ].forEach((pointsString) => {
      obstacleGroup.append(createSvgElement("polygon", { points: pointsString }));
    });

    referencePath.setAttribute(
      "d",
      "M 58 330 C 130 318 164 286 226 256 C 300 218 354 230 426 190 C 510 144 588 140 722 82",
    );
    startMarker.setAttribute("cx", basePoints[0].x);
    startMarker.setAttribute("cy", basePoints[0].y);
    goalMarker.setAttribute("d", makeStarPath(basePoints[basePoints.length - 1].x, basePoints[basePoints.length - 1].y));
  }

  function updateMetrics(currentSamples) {
    const baseSamples = sampleCurve(currentMode, basePoints, currentSamples.length);
    const deviations = currentSamples.map((point, index) => distance(point, baseSamples[index]));
    const horizonCount = Math.max(2, Math.floor(deviations.length * 0.3));
    const near = deviations.slice(0, horizonCount).reduce((sum, value) => sum + value, 0) / horizonCount;
    const full = deviations.reduce((sum, value) => sum + value, 0) / deviations.length;

    nearDeviation.textContent = near.toFixed(1);
    fullDeviation.textContent = full.toFixed(1);
    renderMiniChart(deviations);
  }

  function renderMiniChart(deviations) {
    if (!chartLine || !chartFill) return;

    const width = 240;
    const height = 72;
    const maxDeviation = Math.max(8, ...deviations);
    const reduced = [];
    const count = 54;

    for (let i = 0; i < count; i += 1) {
      const sourceIndex = Math.round((i / (count - 1)) * (deviations.length - 1));
      const x = 8 + (i / (count - 1)) * (width - 16);
      const y = height - 10 - (deviations[sourceIndex] / maxDeviation) * 48;
      reduced.push({ x, y });
    }

    const line = pointsToPath(reduced);
    const area = `${line} L ${width - 8} ${height - 8} L 8 ${height - 8} Z`;

    chartLine.setAttribute("d", line);
    chartFill.setAttribute("d", area);
  }

  function renderPoints() {
    if (!pointsGroup) return;

    pointsGroup.innerHTML = "";

    points.forEach((point, index) => {
      const circle = createSvgElement("circle", {
        class: [
          "point-handle",
          index >= 4 ? "is-distal" : "is-fixed",
          currentMode === "waypoints" ? "is-waypoint" : "",
        ]
          .filter(Boolean)
          .join(" "),
        cx: point.x,
        cy: point.y,
        r: index >= 4 ? 8 : 6.5,
        "data-index": index,
      });

      if (index >= 4) {
        circle.addEventListener("pointerdown", (event) => {
          activePointIndex = index;
          event.preventDefault();
        });
      }

      pointsGroup.append(circle);
    });
  }

  function renderGhostCurves() {
    if (!ghostGroup) return;

    ghostGroup.innerHTML = "";

    ghostCurves.forEach((curve) => {
      const path = createSvgElement("path", {
        class: `ghost-${currentMode}`,
        d: pointsToPath(sampleCurve(currentMode, curve, 180)),
      });

      ghostGroup.append(path);
    });
  }

  function render() {
    if (!mainCurve || !controlPolygon || !nearHorizonPath) return;

    const samples = sampleCurve(currentMode, points, 180);
    const nearSamples = samples.slice(0, Math.max(2, Math.floor(samples.length * 0.3)));

    mainCurve.setAttribute("d", pointsToPath(samples));
    mainCurve.setAttribute("class", `main-curve is-${currentMode}`);
    nearHorizonPath.setAttribute("d", pointsToPath(nearSamples));

    if (currentMode === "bspline") {
      controlPolygon.setAttribute("d", pointsToPath(points));
      controlPolygon.classList.add("is-visible");
    } else {
      controlPolygon.classList.remove("is-visible");
      controlPolygon.removeAttribute("d");
    }

    modeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.mode === currentMode);
    });

    if (modeDescription) {
      modeDescription.textContent = descriptions[currentMode];
    }

    renderGhostCurves();
    renderPoints();
    updateMetrics(samples);
  }

  function svgPointFromEvent(event) {
    if (!svg) return null;

    const matrix = svg.getScreenCTM();
    if (!matrix) return null;

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    return point.matrixTransform(matrix.inverse());
  }

  function updateDraggedPoint(event) {
    if (activePointIndex === null) return;

    const localPoint = svgPointFromEvent(event);
    if (!localPoint) return;

    const index = activePointIndex;
    const previousX = points[index - 1].x + 28;
    const nextX = index < points.length - 1 ? points[index + 1].x - 28 : 724;

    points[index] = {
      x: clampValue(localPoint.x, previousX, nextX),
      y: clampValue(localPoint.y, 58, 368),
    };

    render();
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentMode = button.dataset.mode;
      render();
    });
  });

  perturbButton?.addEventListener("click", () => {
    ghostCurves = Array.from({ length: 6 }, () => makePerturbedPoints(basePoints));
    points = makePerturbedPoints(basePoints);
    render();
  });

  resetButton?.addEventListener("click", () => {
    points = basePoints.map((point) => ({ ...point }));
    ghostCurves = [];
    render();
  });

  window.addEventListener("pointermove", updateDraggedPoint);
  window.addEventListener("pointerup", () => {
    activePointIndex = null;
  });

  drawStaticScene();
  render();
}

const splineCompareLab = document.querySelector("[data-spline-lab]");

if (splineCompareLab) {
  const svgNS = "http://www.w3.org/2000/svg";
  const gtAnchors = [
    { x: 76, y: 322 },
    { x: 150, y: 294 },
    { x: 232, y: 238 },
    { x: 330, y: 198 },
    { x: 442, y: 214 },
    { x: 526, y: 218 },
    { x: 620, y: 148 },
    { x: 704, y: 96 },
  ];
  const modes = ["waypoints", "cubic", "bspline"];
  const panels = modes.map((mode) => {
    const panel = splineCompareLab.querySelector(`[data-spline-panel="${mode}"]`);

    return {
      mode,
      panel,
      svg: panel?.querySelector(`[data-spline-svg="${mode}"]`),
      grid: panel?.querySelector("[data-grid-lines]"),
      obstacles: panel?.querySelector("[data-obstacles]"),
      reference: panel?.querySelector("[data-reference-path]"),
      nearPath: panel?.querySelector("[data-near-horizon-path]"),
      ghosts: panel?.querySelector("[data-ghost-curves]"),
      control: panel?.querySelector("[data-control-polygon]"),
      curve: panel?.querySelector("[data-main-curve]"),
      points: panel?.querySelector("[data-spline-points]"),
      start: panel?.querySelector("[data-start-marker]"),
      goal: panel?.querySelector("[data-goal-marker]"),
    };
  });
  const perturbButton = splineCompareLab.querySelector("[data-perturb]");
  const resetButton = splineCompareLab.querySelector("[data-reset]");
  const chartLines = Object.fromEntries(
    modes.map((mode) => [mode, splineCompareLab.querySelector(`[data-chart-line="${mode}"]`)]),
  );
  const chartZoomLines = Object.fromEntries(
    modes.map((mode) => [mode, splineCompareLab.querySelector(`[data-chart-zoom-line="${mode}"]`)]),
  );
  const metricRefs = Object.fromEntries(
    modes.map((mode) => [
      mode,
      {
        near: splineCompareLab.querySelector(`[data-card-near="${mode}"]`),
        full: splineCompareLab.querySelector(`[data-card-full="${mode}"]`),
      },
    ]),
  );

  let gtSamples = [];
  let referencePathData = "";
  let basePointSets = {};
  let pointSets = {};
  let ghostPointSets = {};
  let activeDrag = null;
  let splineTransitionFrame = null;

  const clampValue = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function createSvgElement(tag, attributes = {}) {
    const element = document.createElementNS(svgNS, tag);

    Object.entries(attributes).forEach(([name, value]) => {
      element.setAttribute(name, String(value));
    });

    return element;
  }

  function pointsToPath(samples) {
    if (!samples.length) return "";

    return samples
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
  }

  function makeStarPath(cx, cy, outer = 13, inner = 6, spikes = 5) {
    const commands = [];

    for (let i = 0; i < spikes * 2; i += 1) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (i * Math.PI) / spikes;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      commands.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }

    return `${commands.join(" ")} Z`;
  }

  function samplePolyline(pointSet, count = 180) {
    const samples = [];
    const lastSegment = pointSet.length - 1;

    for (let i = 0; i < count; i += 1) {
      const scaled = (i / (count - 1)) * lastSegment;
      const segment = Math.min(lastSegment - 1, Math.floor(scaled));
      const local = scaled - segment;
      const start = pointSet[segment];
      const end = pointSet[segment + 1];

      samples.push({
        x: start.x + (end.x - start.x) * local,
        y: start.y + (end.y - start.y) * local,
      });
    }

    return samples;
  }

  function solveNaturalSecondDerivatives(values) {
    const n = values.length;
    const lower = Array(n).fill(0);
    const diag = Array(n).fill(0);
    const upper = Array(n).fill(0);
    const rhs = Array(n).fill(0);

    diag[0] = 1;
    diag[n - 1] = 1;

    for (let i = 1; i < n - 1; i += 1) {
      lower[i] = 1;
      diag[i] = 4;
      upper[i] = 1;
      rhs[i] = 6 * (values[i + 1] - 2 * values[i] + values[i - 1]);
    }

    for (let i = 1; i < n; i += 1) {
      const factor = lower[i] / diag[i - 1];
      diag[i] -= factor * upper[i - 1];
      rhs[i] -= factor * rhs[i - 1];
    }

    const second = Array(n).fill(0);
    second[n - 1] = rhs[n - 1] / diag[n - 1];

    for (let i = n - 2; i >= 0; i -= 1) {
      second[i] = (rhs[i] - upper[i] * second[i + 1]) / diag[i];
    }

    return second;
  }

  function naturalCubicValue(values, second, segment, local) {
    const a = 1 - local;
    const b = local;

    return (
      (second[segment] * a * a * a) / 6 +
      (second[segment + 1] * b * b * b) / 6 +
      (values[segment] - second[segment] / 6) * a +
      (values[segment + 1] - second[segment + 1] / 6) * b
    );
  }

  function sampleNaturalCubic(pointSet, count = 180) {
    const valuesX = pointSet.map((point) => point.x);
    const valuesY = pointSet.map((point) => point.y);
    const secondX = solveNaturalSecondDerivatives(valuesX);
    const secondY = solveNaturalSecondDerivatives(valuesY);
    const samples = [];
    const lastSegment = pointSet.length - 1;

    for (let i = 0; i < count; i += 1) {
      const scaled = (i / (count - 1)) * lastSegment;
      const segment = Math.min(lastSegment - 1, Math.floor(scaled));
      const local = scaled - segment;

      samples.push({
        x: naturalCubicValue(valuesX, secondX, segment, local),
        y: naturalCubicValue(valuesY, secondY, segment, local),
      });
    }

    return samples;
  }

  function makeOpenUniformKnots(pointCount, degree) {
    const n = pointCount - 1;
    const knotCount = n + degree + 2;
    const internalCount = n - degree;
    const knots = [];

    for (let i = 0; i < knotCount; i += 1) {
      if (i <= degree) {
        knots.push(0);
      } else if (i >= knotCount - degree - 1) {
        knots.push(1);
      } else {
        knots.push((i - degree) / (internalCount + 1));
      }
    }

    return knots;
  }

  function deBoor(pointSet, degree, knots, t) {
    const n = pointSet.length - 1;
    let span = degree;

    if (t >= 1) {
      span = n;
    } else {
      for (let i = degree; i <= n; i += 1) {
        if (t >= knots[i] && t < knots[i + 1]) {
          span = i;
          break;
        }
      }
    }

    const d = [];

    for (let j = 0; j <= degree; j += 1) {
      d[j] = { ...pointSet[span - degree + j] };
    }

    for (let r = 1; r <= degree; r += 1) {
      for (let j = degree; j >= r; j -= 1) {
        const left = knots[span - degree + j];
        const right = knots[span + 1 + j - r];
        const alpha = right === left ? 0 : (t - left) / (right - left);

        d[j] = {
          x: (1 - alpha) * d[j - 1].x + alpha * d[j].x,
          y: (1 - alpha) * d[j - 1].y + alpha * d[j].y,
        };
      }
    }

    return d[degree];
  }

  function sampleBSpline(pointSet, count = 180) {
    const degree = 3;
    const knots = makeOpenUniformKnots(pointSet.length, degree);
    const samples = [];

    for (let i = 0; i < count; i += 1) {
      samples.push(deBoor(pointSet, degree, knots, i / (count - 1)));
    }

    return samples;
  }

  function sampleCurve(mode, pointSet, count = 180) {
    if (mode === "cubic") return sampleNaturalCubic(pointSet, count);
    if (mode === "bspline") return sampleBSpline(pointSet, count);
    return samplePolyline(pointSet, count);
  }

  function sampleByArcLength(samples, count) {
    if (!samples.length) return [];
    if (samples.length === 1) return Array.from({ length: count }, () => ({ ...samples[0] }));

    const cumulative = [0];

    for (let i = 1; i < samples.length; i += 1) {
      cumulative.push(cumulative[i - 1] + distance(samples[i - 1], samples[i]));
    }

    const total = cumulative[cumulative.length - 1] || 1;
    const resampled = [];

    for (let i = 0; i < count; i += 1) {
      const target = (i / (count - 1)) * total;
      let segment = 1;

      while (segment < cumulative.length - 1 && cumulative[segment] < target) {
        segment += 1;
      }

      const startDistance = cumulative[segment - 1];
      const endDistance = cumulative[segment];
      const local = endDistance === startDistance ? 0 : (target - startDistance) / (endDistance - startDistance);
      const start = samples[segment - 1];
      const end = samples[segment];

      resampled.push({
        x: start.x + (end.x - start.x) * local,
        y: start.y + (end.y - start.y) * local,
      });
    }

    return resampled;
  }

  function bsplineBasis(index, degree, knots, t) {
    if (degree === 0) {
      return knots[index] <= t && t < knots[index + 1] ? 1 : 0;
    }

    const leftSpan = knots[index + degree] - knots[index];
    const rightSpan = knots[index + degree + 1] - knots[index + 1];
    const left = leftSpan === 0 ? 0 : ((t - knots[index]) / leftSpan) * bsplineBasis(index, degree - 1, knots, t);
    const right = rightSpan === 0 ? 0 : ((knots[index + degree + 1] - t) / rightSpan) * bsplineBasis(index + 1, degree - 1, knots, t);

    return left + right;
  }

  function solveLinearSystem(matrix, rhs) {
    const n = rhs.length;
    const a = matrix.map((row, index) => [...row, rhs[index]]);

    for (let column = 0; column < n; column += 1) {
      let pivot = column;

      for (let row = column + 1; row < n; row += 1) {
        if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) {
          pivot = row;
        }
      }

      [a[column], a[pivot]] = [a[pivot], a[column]];

      const divisor = a[column][column] || 1e-8;
      for (let entry = column; entry <= n; entry += 1) {
        a[column][entry] /= divisor;
      }

      for (let row = 0; row < n; row += 1) {
        if (row === column) continue;

        const factor = a[row][column];
        for (let entry = column; entry <= n; entry += 1) {
          a[row][entry] -= factor * a[column][entry];
        }
      }
    }

    return a.map((row) => row[n]);
  }

  function fitBSplineToCurve(samples, controlCount = 8) {
    const degree = 3;
    const knots = makeOpenUniformKnots(controlCount, degree);
    const fixedStart = samples[0];
    const fixedEnd = samples[samples.length - 1];
    const unknownCount = controlCount - 2;
    const normal = Array.from({ length: unknownCount }, () => Array(unknownCount).fill(0));
    const rhsX = Array(unknownCount).fill(0);
    const rhsY = Array(unknownCount).fill(0);

    samples.forEach((sample, sampleIndex) => {
      const t = Math.min(1 - 1e-6, sampleIndex / (samples.length - 1));
      const basis = Array.from({ length: controlCount }, (_, index) => bsplineBasis(index, degree, knots, t));
      const targetX = sample.x - basis[0] * fixedStart.x - basis[controlCount - 1] * fixedEnd.x;
      const targetY = sample.y - basis[0] * fixedStart.y - basis[controlCount - 1] * fixedEnd.y;

      for (let row = 0; row < unknownCount; row += 1) {
        const rowBasis = basis[row + 1];
        rhsX[row] += rowBasis * targetX;
        rhsY[row] += rowBasis * targetY;

        for (let column = 0; column < unknownCount; column += 1) {
          normal[row][column] += rowBasis * basis[column + 1];
        }
      }
    });

    for (let i = 0; i < unknownCount; i += 1) {
      normal[i][i] += 1e-4;
    }

    const fittedX = solveLinearSystem(normal, rhsX);
    const fittedY = solveLinearSystem(normal, rhsY);
    const controls = [{ ...fixedStart }];

    for (let i = 0; i < unknownCount; i += 1) {
      controls.push({ x: fittedX[i], y: fittedY[i] });
    }

    controls.push({ ...fixedEnd });
    return controls;
  }

  function rmseToReference(mode, pointSet, targetSamples) {
    const samples = sampleCurve(mode, pointSet, targetSamples.length);
    const meanSquare = samples.reduce((sum, point, index) => {
      const value = distance(point, targetSamples[index]);
      return sum + value * value;
    }, 0) / samples.length;

    return Math.sqrt(meanSquare);
  }

  function optimizeFittedPoints(mode, initialPoints) {
    const targetSamples = sampleByArcLength(gtSamples, 90);
    const candidate = initialPoints.map((point) => ({ ...point }));
    let best = rmseToReference(mode, candidate, targetSamples);
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    [18, 8, 3].forEach((step) => {
      let improved = true;
      let passes = 0;

      while (improved && passes < 1) {
        improved = false;
        passes += 1;

        for (let index = 1; index < candidate.length - 1; index += 1) {
          directions.forEach((direction) => {
            const original = { ...candidate[index] };
            candidate[index] = {
              x: clampValue(original.x + direction.x * step, 42, 724),
              y: clampValue(original.y + direction.y * step, 62, 366),
            };

            const score = rmseToReference(mode, candidate, targetSamples);
            if (score < best) {
              best = score;
              improved = true;
            } else {
              candidate[index] = original;
            }
          });
        }
      }
    });

    return candidate;
  }

  function clonePointSets(source) {
    return Object.fromEntries(
      modes.map((mode) => [mode, source[mode].map((point) => ({ ...point }))]),
    );
  }

  function cloneGhostPointSets(source) {
    return Object.fromEntries(
      modes.map((mode) => [mode, (source[mode] || []).map((pointSet) => pointSet.map((point) => ({ ...point })))]),
    );
  }

  function interpolatePointSet(fromSet, toSet, progress) {
    return toSet.map((targetPoint, index) => {
      const sourcePoint = fromSet[index] || targetPoint;

      return {
        x: sourcePoint.x + (targetPoint.x - sourcePoint.x) * progress,
        y: sourcePoint.y + (targetPoint.y - sourcePoint.y) * progress,
      };
    });
  }

  function interpolatePointSets(fromSets, toSets, progress) {
    return Object.fromEntries(
      modes.map((mode) => [mode, interpolatePointSet(fromSets[mode], toSets[mode], progress)]),
    );
  }

  function easeOutCubic(value) {
    return 1 - (1 - value) ** 3;
  }

  function cancelSplineTransition() {
    if (!splineTransitionFrame) return;
    window.cancelAnimationFrame(splineTransitionFrame);
    splineTransitionFrame = null;
  }

  function animateSplineState(targetPointSets, targetGhostPointSets, duration = 620) {
    cancelSplineTransition();

    const startPointSets = clonePointSets(pointSets);
    const targetGhosts = cloneGhostPointSets(targetGhostPointSets);
    const startGhosts = Object.fromEntries(
      modes.map((mode) => [
        mode,
        targetGhosts[mode].map((_, index) => {
          const currentGhost = ghostPointSets[mode]?.[index];
          const fallback = pointSets[mode] || basePointSets[mode];
          return (currentGhost || fallback).map((point) => ({ ...point }));
        }),
      ]),
    );
    const startTime = window.performance.now();

    const step = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = easeOutCubic(progress);

      pointSets = interpolatePointSets(startPointSets, targetPointSets, eased);
      ghostPointSets = Object.fromEntries(
        modes.map((mode) => [
          mode,
          targetGhosts[mode].map((targetSet, index) => interpolatePointSet(startGhosts[mode][index], targetSet, eased)),
        ]),
      );
      renderAll();

      if (progress < 1) {
        splineTransitionFrame = window.requestAnimationFrame(step);
        return;
      }

      pointSets = clonePointSets(targetPointSets);
      ghostPointSets = cloneGhostPointSets(targetGhostPointSets);
      splineTransitionFrame = null;
      renderAll();
    };

    splineTransitionFrame = window.requestAnimationFrame(step);
  }

  function makeBasePointSets() {
    gtSamples = sampleNaturalCubic(gtAnchors, 260);
    referencePathData = pointsToPath(gtSamples);

    const initialFit = sampleByArcLength(gtSamples, 8);

    return {
      waypoints: optimizeFittedPoints("waypoints", initialFit),
      cubic: optimizeFittedPoints("cubic", initialFit),
      bspline: fitBSplineToCurve(sampleByArcLength(gtSamples, 180), 8),
    };
  }

  function makeDistalOffsets(radius = 58) {
    return Array.from({ length: 3 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const length = Math.sqrt(Math.random()) * radius;

      return {
        x: Math.cos(angle) * length,
        y: Math.sin(angle) * length,
      };
    });
  }

  function applyDistalOffsets(baseSet, offsets) {
    const next = baseSet.map((point) => ({ ...point }));
    const firstDistalIndex = next.length - offsets.length - 1;

    offsets.forEach((offset, offsetIndex) => {
      const index = firstDistalIndex + offsetIndex;
      const base = baseSet[index];

      next[index] = {
        x: clampValue(base.x + offset.x, 42, 724),
        y: clampValue(base.y + offset.y, 62, 366),
      };
    });

    return next;
  }

  function drawStaticScene(panel) {
    if (!panel.grid || !panel.obstacles || !panel.reference || !panel.start || !panel.goal) return;

    panel.grid.innerHTML = "";
    panel.obstacles.innerHTML = "";

    for (let x = 80; x < 760; x += 80) {
      panel.grid.append(createSvgElement("line", { x1: x, y1: 32, x2: x, y2: 398 }));
    }

    for (let y = 70; y < 430; y += 70) {
      panel.grid.append(createSvgElement("line", { x1: 30, y1: y, x2: 732, y2: y }));
    }

    [
      {
        face: "218,286 274,258 312,304 254,354",
        side: "312,304 326,316 266,368 254,354",
        ridge: "230,292 274,268 300,304 254,344",
      },
      {
        face: "408,112 462,82 512,120 486,166 420,154",
        side: "512,120 524,132 498,178 486,166",
        ridge: "421,116 462,92 497,122 480,154 428,146",
      },
      {
        face: "542,246 626,214 682,272 638,338 556,314",
        side: "682,272 696,286 650,352 638,338",
        ridge: "558,252 624,226 664,272 632,322 568,304",
      },
    ].forEach((obstacle) => {
      const group = createSvgElement("g", { class: "obstacle-3d" });
      group.append(createSvgElement("polygon", { class: "obstacle-shadow", points: obstacle.face, transform: "translate(10 12)" }));
      group.append(createSvgElement("polygon", { class: "obstacle-side", points: obstacle.side }));
      group.append(createSvgElement("polygon", { class: "obstacle-face", points: obstacle.face }));
      group.append(createSvgElement("polygon", { class: "obstacle-ridge", points: obstacle.ridge }));
      panel.obstacles.append(group);
    });

    panel.reference.setAttribute("d", referencePathData);
    panel.start.setAttribute("cx", gtSamples[0].x);
    panel.start.setAttribute("cy", gtSamples[0].y);
    panel.goal.setAttribute("d", makeStarPath(gtSamples[gtSamples.length - 1].x, gtSamples[gtSamples.length - 1].y));
  }

  function renderPanel(panel) {
    if (!panel.curve || !panel.nearPath || !panel.control || !panel.ghosts || !panel.points) return;

    const modePoints = pointSets[panel.mode];
    const samples = sampleCurve(panel.mode, modePoints, 180);
    const nearSamples = samples.slice(0, Math.max(2, Math.floor(samples.length * 0.3)));

    panel.curve.setAttribute("d", pointsToPath(samples));
    panel.curve.setAttribute("class", `main-curve is-${panel.mode}`);
    panel.nearPath.setAttribute("d", pointsToPath(nearSamples));

    if (panel.mode === "bspline") {
      panel.control.setAttribute("d", pointsToPath(modePoints));
      panel.control.classList.add("is-visible");
    } else {
      panel.control.removeAttribute("d");
      panel.control.classList.remove("is-visible");
    }

    panel.ghosts.innerHTML = "";
    ghostPointSets[panel.mode].forEach((pointSet) => {
      panel.ghosts.append(
        createSvgElement("path", {
          class: `ghost-${panel.mode}`,
          d: pointsToPath(sampleCurve(panel.mode, pointSet, 180)),
        }),
      );
    });

    panel.points.innerHTML = "";
    modePoints.forEach((point, index) => {
      const isDistal = index >= modePoints.length - 4 && index < modePoints.length - 1;
      const circle = createSvgElement("circle", {
        class: [
          "point-handle",
          isDistal ? "is-distal" : "is-fixed",
          panel.mode === "waypoints" ? "is-waypoint" : "",
        ]
          .filter(Boolean)
          .join(" "),
        cx: point.x,
        cy: point.y,
        r: isDistal ? 8 : 6.5,
      });

      if (isDistal) {
        const title = createSvgElement("title");
        title.textContent = "Drag this point";
        circle.append(title);
        circle.addEventListener("pointerdown", (event) => {
          cancelSplineTransition();
          activeDrag = { index, mode: panel.mode, svg: panel.svg };
          event.preventDefault();
        });
      }

      panel.points.append(circle);
    });

    return samples;
  }

  function computeDeviations(mode, samples) {
    const baseSamples = sampleCurve(mode, basePointSets[mode], samples.length);
    const deviations = samples.map((point, index) => distance(point, baseSamples[index]));
    const horizonCount = Math.max(2, Math.floor(deviations.length * 0.3));
    const near = deviations.slice(0, horizonCount).reduce((sum, value) => sum + value, 0) / horizonCount;
    const full = deviations.reduce((sum, value) => sum + value, 0) / deviations.length;

    return { deviations, near, full };
  }

  function metricPath(deviations, maxDeviation, options = {}) {
    const width = options.width ?? 240;
    const height = options.height ?? 72;
    const count = options.count ?? 54;
    const startIndex = options.startIndex ?? 0;
    const endIndex = options.endIndex ?? deviations.length - 1;
    const samples = [];

    for (let i = 0; i < count; i += 1) {
      const ratio = i / (count - 1);
      const sourceIndex = Math.round(startIndex + ratio * (endIndex - startIndex));
      samples.push({
        x: 8 + ratio * (width - 16),
        y: height - 10 - (deviations[sourceIndex] / maxDeviation) * 48,
      });
    }

    return pointsToPath(samples);
  }

  function updateMetrics(samplesByMode) {
    const results = Object.fromEntries(
      modes.map((mode) => [mode, computeDeviations(mode, samplesByMode[mode])]),
    );
    const maxDeviation = Math.max(8, ...modes.flatMap((mode) => results[mode].deviations));
    const horizonIndex = Math.max(2, Math.floor(results.waypoints.deviations.length * 0.3));
    const nearMaxDeviation = Math.max(
      1.2,
      ...modes.flatMap((mode) => results[mode].deviations.slice(0, horizonIndex + 1)),
    );

    modes.forEach((mode) => {
      if (metricRefs[mode]?.near) metricRefs[mode].near.textContent = results[mode].near.toFixed(1);
      if (metricRefs[mode]?.full) metricRefs[mode].full.textContent = results[mode].full.toFixed(1);
      if (chartLines[mode]) chartLines[mode].setAttribute("d", metricPath(results[mode].deviations, maxDeviation));
      if (chartZoomLines[mode]) {
        chartZoomLines[mode].setAttribute(
          "d",
          metricPath(results[mode].deviations, nearMaxDeviation, {
            height: 68,
            count: 42,
            startIndex: 0,
            endIndex: horizonIndex,
          }),
        );
      }
    });
  }

  function renderAll() {
    const samplesByMode = {};

    panels.forEach((panel) => {
      samplesByMode[panel.mode] = renderPanel(panel);
    });

    updateMetrics(samplesByMode);
  }

  function svgPointFromEvent(event, svg) {
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    return point.matrixTransform(matrix.inverse());
  }

  function updateDraggedPoint(event) {
    if (!activeDrag) return;

    const localPoint = svgPointFromEvent(event, activeDrag.svg);
    if (!localPoint) return;

    const index = activeDrag.index;
    const mode = activeDrag.mode;
    const basePoint = basePointSets[mode][index];
    const radius = 58;
    let dx = localPoint.x - basePoint.x;
    let dy = localPoint.y - basePoint.y;
    const length = Math.hypot(dx, dy);

    if (length > radius) {
      dx = (dx / length) * radius;
      dy = (dy / length) * radius;
    }

    pointSets[mode][index] = {
      x: clampValue(basePoint.x + dx, 42, 724),
      y: clampValue(basePoint.y + dy, 62, 366),
    };

    renderAll();
  }

  function perturbSplineComparison() {
    const ghostOffsets = Array.from({ length: 6 }, () => makeDistalOffsets());
    const mainOffsets = makeDistalOffsets();

    const targetGhostPointSets = Object.fromEntries(
      modes.map((mode) => [mode, ghostOffsets.map((offsets) => applyDistalOffsets(basePointSets[mode], offsets))]),
    );
    const targetPointSets = Object.fromEntries(
      modes.map((mode) => [mode, applyDistalOffsets(basePointSets[mode], mainOffsets)]),
    );

    animateSplineState(targetPointSets, targetGhostPointSets);
  }

  function resetSplineComparison() {
    animateSplineState(clonePointSets(basePointSets), Object.fromEntries(modes.map((mode) => [mode, []])), 440);
  }

  window.sandSplinePerturb = perturbSplineComparison;
  window.sandSplineReset = resetSplineComparison;

  function bindActionButton(button, handler) {
    let handledByPointer = false;

    button?.addEventListener("pointerdown", (event) => {
      handledByPointer = true;
      event.preventDefault();
      handler();
    });

    button?.addEventListener("click", () => {
      if (handledByPointer) {
        handledByPointer = false;
        return;
      }

      handler();
    });
  }

  bindActionButton(perturbButton, perturbSplineComparison);
  bindActionButton(resetButton, resetSplineComparison);

  window.addEventListener("pointermove", updateDraggedPoint);
  window.addEventListener("pointerup", () => {
    activeDrag = null;
  });

  basePointSets = makeBasePointSets();
  pointSets = clonePointSets(basePointSets);
  ghostPointSets = Object.fromEntries(modes.map((mode) => [mode, []]));

  panels.forEach(drawStaticScene);
  renderAll();
}
