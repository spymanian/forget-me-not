"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type CapsuleSummary = {
  id: string;
  title: string;
  createdAt: string;
  unlockAt: string;
  mood: string;
  moodColor: string;
  unlocked: boolean;
};

type OrbPosition = {
  id: string;
  left: number;
  top: number;
  delayMs: number;
};

type GridCoord = {
  x: number;
  y: number;
};

type OrbBody = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

type DragState = {
  id: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
  moved: boolean;
};

function hashToNum(input: string) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function toCoordKey(coord: GridCoord) {
  return `${coord.x},${coord.y}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function vibrantRgbTripletFromHex(hex: string) {
  const cleaned = hex.replace("#", "").trim();

  if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
    return "167 139 250";
  }

  const r = Number.parseInt(cleaned.slice(0, 2), 16);
  const g = Number.parseInt(cleaned.slice(2, 4), 16);
  const b = Number.parseInt(cleaned.slice(4, 6), 16);

  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta > 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (max === rf) {
      h = ((gf - bf) / delta + (gf < bf ? 6 : 0)) / 6;
    } else if (max === gf) {
      h = ((bf - rf) / delta + 2) / 6;
    } else {
      h = ((rf - gf) / delta + 4) / 6;
    }
  }

  const boostedS = clamp(s * 1.35 + 0.12, 0.48, 1);
  const boostedL = clamp(l * 0.82 + 0.16, 0.4, 0.72);

  function hueToRgb(p: number, q: number, t: number) {
    let value = t;
    if (value < 0) {
      value += 1;
    }
    if (value > 1) {
      value -= 1;
    }
    if (value < 1 / 6) {
      return p + (q - p) * 6 * value;
    }
    if (value < 1 / 2) {
      return q;
    }
    if (value < 2 / 3) {
      return p + (q - p) * (2 / 3 - value) * 6;
    }
    return p;
  }

  let outR = boostedL;
  let outG = boostedL;
  let outB = boostedL;

  if (boostedS > 0) {
    const q = boostedL < 0.5 ? boostedL * (1 + boostedS) : boostedL + boostedS - boostedL * boostedS;
    const p = 2 * boostedL - q;
    outR = hueToRgb(p, q, h + 1 / 3);
    outG = hueToRgb(p, q, h);
    outB = hueToRgb(p, q, h - 1 / 3);
  }

  return `${Math.round(outR * 255)} ${Math.round(outG * 255)} ${Math.round(outB * 255)}`;
}

function getGlowStrength(capsule: CapsuleSummary, nowMs: number) {
  const unlockMs = new Date(capsule.unlockAt).getTime();
  const createdMs = new Date(capsule.createdAt).getTime();

  if (!Number.isFinite(unlockMs)) {
    return 0.25;
  }

  if (nowMs >= unlockMs) {
    return 1;
  }

  if (!Number.isFinite(createdMs) || createdMs >= unlockMs) {
    const dayMs = 24 * 60 * 60 * 1000;
    const normalized = 1 - Math.min(1, Math.max(0, (unlockMs - nowMs) / dayMs));
    return 0.2 + normalized * 0.8;
  }

  const totalMs = unlockMs - createdMs;
  const elapsedMs = Math.max(0, Math.min(totalMs, nowMs - createdMs));
  const progress = elapsedMs / totalMs;

  return 0.16 + progress * 0.84;
}

function buildOrbPositions(capsules: CapsuleSummary[], width: number, height: number) {
  const directions: GridCoord[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
  ];

  const coords: GridCoord[] = [];
  const occupied = new Set<string>();

  for (let index = 0; index < capsules.length; index += 1) {
    if (index === 0) {
      const origin = { x: 0, y: 0 };
      coords.push(origin);
      occupied.add(toCoordKey(origin));
      continue;
    }

    const seed = hashToNum(`${capsules[index].id}:${index}`);
    let placed: GridCoord | null = null;

    for (let parentOffset = 0; parentOffset < coords.length && !placed; parentOffset += 1) {
      const parentIndex = (seed + parentOffset) % coords.length;
      const parent = coords[parentIndex];
      const directionStart = Math.floor(seed / 97) % directions.length;

      for (let directionOffset = 0; directionOffset < directions.length; directionOffset += 1) {
        const direction = directions[(directionStart + directionOffset) % directions.length];
        const candidate = { x: parent.x + direction.x, y: parent.y + direction.y };

        if (!occupied.has(toCoordKey(candidate))) {
          placed = candidate;
          break;
        }
      }
    }

    if (!placed) {
      for (let ringRadius = 2; ringRadius <= 40 && !placed; ringRadius += 1) {
        const ring: GridCoord[] = [];

        for (let x = -ringRadius; x <= ringRadius; x += 1) {
          ring.push({ x, y: -ringRadius });
          ring.push({ x, y: ringRadius });
        }

        for (let y = -ringRadius + 1; y <= ringRadius - 1; y += 1) {
          ring.push({ x: -ringRadius, y });
          ring.push({ x: ringRadius, y });
        }

        const startIndex = seed % ring.length;

        for (let ringOffset = 0; ringOffset < ring.length; ringOffset += 1) {
          const candidate = ring[(startIndex + ringOffset) % ring.length];

          if (!occupied.has(toCoordKey(candidate))) {
            placed = candidate;
            break;
          }
        }
      }
    }

    const fallback = placed ?? { x: index, y: 0 };
    coords.push(fallback);
    occupied.add(toCoordKey(fallback));
  }

  const stepPx = 104;
  const paddingPx = 56;

  const maxAbsX = Math.max(1, ...coords.map((coord) => Math.abs(coord.x)));
  const maxAbsY = Math.max(1, ...coords.map((coord) => Math.abs(coord.y)));

  const availableX = width / 2 - paddingPx;
  const availableY = height / 2 - paddingPx;
  const scaleX = availableX / (maxAbsX * stepPx);
  const scaleY = availableY / (maxAbsY * stepPx);
  const scale = Math.max(0.34, Math.min(1, scaleX, scaleY));

  const positions: OrbPosition[] = capsules.map((capsule, index) => {
    const coord = coords[index];
    const seed = hashToNum(capsule.id);
    const xPx = coord.x * stepPx * scale;
    const yPx = coord.y * stepPx * scale;

    return {
      id: capsule.id,
      left: 50 + (xPx / width) * 100,
      top: 50 + (yPx / height) * 100,
      delayMs: index * 120 + (seed % 110),
    };
  });

  return positions;
}

export default function OrbGarden({
  capsules,
  onSelect,
  width = 800,
  height = 420,
  fullscreen = false,
  bloomingOrbId = null,
  bloomToken = 0,
}: {
  capsules: CapsuleSummary[];
  onSelect: (id: string) => void;
  width?: number;
  height?: number;
  fullscreen?: boolean;
  bloomingOrbId?: string | null;
  bloomToken?: number;
}) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState({ width, height });
  const [bodies, setBodies] = useState<OrbBody[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const bodiesRef = useRef<OrbBody[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const suppressClickUntilRef = useRef<Record<string, number>>({});

  const layoutWidth = Math.max(1, bounds.width);
  const layoutHeight = Math.max(1, bounds.height);

  const anchorPositions = useMemo(
    () => buildOrbPositions(capsules, layoutWidth, layoutHeight),
    [capsules, layoutWidth, layoutHeight],
  );
  const anchorById = useMemo(
    () =>
      new Map(
        anchorPositions.map((position) => [
          position.id,
          {
            x: (position.left / 100) * layoutWidth,
            y: (position.top / 100) * layoutHeight,
          },
        ]),
      ),
    [anchorPositions, layoutHeight, layoutWidth],
  );

  useEffect(() => {
    bodiesRef.current = bodies;
  }, [bodies]);

  useEffect(() => {
    const node = innerRef.current;

    if (!node) {
      return;
    }

    const updateBounds = () => {
      const rect = node.getBoundingClientRect();
      const nextWidth = Math.max(1, rect.width);
      const nextHeight = Math.max(1, rect.height);

      setBounds((current) => {
        if (Math.abs(current.width - nextWidth) < 0.5 && Math.abs(current.height - nextHeight) < 0.5) {
          return current;
        }

        return { width: nextWidth, height: nextHeight };
      });
    };

    updateBounds();

    const observer = new ResizeObserver(() => {
      updateBounds();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const radius = layoutWidth < 640 ? 39 : 47;
    const rafId = window.requestAnimationFrame(() => {
      setBodies((current) => {
        const previous = new Map(current.map((body) => [body.id, body]));

        return capsules.map((capsule, index) => {
          const existing = previous.get(capsule.id);

          if (existing) {
            return { ...existing, radius };
          }

          const position = anchorPositions[index];
          const seed = hashToNum(capsule.id);

          return {
            id: capsule.id,
            x: (position.left / 100) * layoutWidth,
            y: (position.top / 100) * layoutHeight,
            vx: (((seed % 17) - 8) / 8) * 9,
            vy: ((((seed >>> 5) % 17) - 8) / 8) * 9,
            radius,
          };
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [capsules, anchorPositions, layoutWidth, layoutHeight]);

  useEffect(() => {
    if (bodies.length === 0) {
      return;
    }

    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const next = bodiesRef.current.map((body) => ({ ...body }));
      const drag = dragRef.current;
      const mouse = mouseRef.current;
      let nearestOrbId: string | null = null;

      if (mouse.active) {
        let nearestDistanceSq = Number.POSITIVE_INFINITY;

        for (let i = 0; i < next.length; i += 1) {
          const body = next[i];

          if (drag?.id === body.id) {
            continue;
          }

          const dx = mouse.x - body.x;
          const dy = mouse.y - body.y;
          const distanceSq = dx * dx + dy * dy;

          if (distanceSq < nearestDistanceSq) {
            nearestDistanceSq = distanceSq;
            nearestOrbId = body.id;
          }
        }
      }

      for (let index = 0; index < next.length; index += 1) {
        const body = next[index];

        if (drag?.id === body.id) {
          continue;
        }

        const phase = (hashToNum(body.id) % 360) * (Math.PI / 180);
        const driftAx = Math.cos(now / 2400 + phase) * 2.4;
        const driftAy = Math.sin(now / 2200 + phase) * 2.4;
        const anchor = anchorById.get(body.id);
        const springAx = anchor ? (anchor.x - body.x) * 0.02 : 0;
        const springAy = anchor ? (anchor.y - body.y) * 0.02 : 0;
        let mouseAx = 0;
        let mouseAy = 0;

        if (nearestOrbId === body.id && mouse.active) {
          const dx = mouse.x - body.x;
          const dy = mouse.y - body.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const pull = Math.min(24, distance * 0.1);
          mouseAx = (dx / distance) * pull;
          mouseAy = (dy / distance) * pull;
        }

        body.vx += (driftAx + springAx + mouseAx) * dt;
        body.vy += (driftAy + springAy + mouseAy) * dt;

        body.vx *= 0.988;
        body.vy *= 0.988;

        const speed = Math.hypot(body.vx, body.vy);
        if (speed > 74) {
          const scale = 74 / speed;
          body.vx *= scale;
          body.vy *= scale;
        }

        body.x += body.vx * dt;
        body.y += body.vy * dt;

        const minX = body.radius;
        const maxX = layoutWidth - body.radius;
        const minY = body.radius;
        const maxY = layoutHeight - body.radius;

        if (body.x < minX) {
          body.x = minX;
          body.vx = Math.abs(body.vx) * 0.62;
        } else if (body.x > maxX) {
          body.x = maxX;
          body.vx = -Math.abs(body.vx) * 0.62;
        }

        if (body.y < minY) {
          body.y = minY;
          body.vy = Math.abs(body.vy) * 0.62;
        } else if (body.y > maxY) {
          body.y = maxY;
          body.vy = -Math.abs(body.vy) * 0.62;
        }
      }

      for (let pass = 0; pass < 2; pass += 1) {
        for (let i = 0; i < next.length; i += 1) {
          for (let j = i + 1; j < next.length; j += 1) {
            const a = next[i];
            const b = next[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const minDist = a.radius + b.radius;
            const distSq = dx * dx + dy * dy;

            if (distSq >= minDist * minDist) {
              continue;
            }

            const dist = Math.max(0.0001, Math.sqrt(distSq));
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) * 0.76;

            const invMassA = 1 / a.radius;
            const invMassB = 1 / b.radius;
            const invMassTotal = invMassA + invMassB;

            if (drag?.id !== a.id) {
              a.x -= nx * overlap * (invMassA / invMassTotal);
              a.y -= ny * overlap * (invMassA / invMassTotal);
            }

            if (drag?.id !== b.id) {
              b.x += nx * overlap * (invMassB / invMassTotal);
              b.y += ny * overlap * (invMassB / invMassTotal);
            }

            const relativeVx = b.vx - a.vx;
            const relativeVy = b.vy - a.vy;
            const velocityAlongNormal = relativeVx * nx + relativeVy * ny;

            if (velocityAlongNormal > 0) {
              continue;
            }

            const restitution = 0.64;
            const impulse = (-(1 + restitution) * velocityAlongNormal) / invMassTotal;
            const impulseX = impulse * nx;
            const impulseY = impulse * ny;

            if (drag?.id !== a.id) {
              a.vx -= impulseX * invMassA;
              a.vy -= impulseY * invMassA;
            }

            if (drag?.id !== b.id) {
              b.vx += impulseX * invMassB;
              b.vy += impulseY * invMassB;
            }

            const tangentX = -ny;
            const tangentY = nx;
            const relativeTangent = relativeVx * tangentX + relativeVy * tangentY;
            const frictionImpulse = (relativeTangent * 0.1) / invMassTotal;
            const frictionX = frictionImpulse * tangentX;
            const frictionY = frictionImpulse * tangentY;

            if (drag?.id !== a.id) {
              a.vx += frictionX * invMassA;
              a.vy += frictionY * invMassA;
            }

            if (drag?.id !== b.id) {
              b.vx -= frictionX * invMassB;
              b.vy -= frictionY * invMassB;
            }
          }
        }
      }

      bodiesRef.current = next;
      setBodies(next);
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [anchorById, bodies.length, layoutHeight, layoutWidth]);

  function updateDraggedBody(pointerX: number, pointerY: number, now: number) {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    const next = bodiesRef.current.map((body) => ({ ...body }));
    const target = next.find((body) => body.id === drag.id);

    if (!target) {
      return;
    }

    const nextX = clamp(pointerX + drag.offsetX, target.radius, layoutWidth - target.radius);
    const nextY = clamp(pointerY + drag.offsetY, target.radius, layoutHeight - target.radius);
    const dt = Math.max(0.001, (now - drag.lastTime) / 1000);
    const rawVx = (nextX - target.x) / dt;
    const rawVy = (nextY - target.y) / dt;
    target.vx = clamp(rawVx, -120, 120);
    target.vy = clamp(rawVy, -120, 120);
    target.x = nextX;
    target.y = nextY;

    if (Math.hypot(nextX - drag.lastX, nextY - drag.lastY) > 1.5) {
      drag.moved = true;
    }

    drag.lastX = nextX;
    drag.lastY = nextY;
    drag.lastTime = now;

    bodiesRef.current = next;
    setBodies(next);
  }

  const bodyById = useMemo(() => new Map(bodies.map((body) => [body.id, body])), [bodies]);

  return (
    <>
      <div
        className="orbgarden-wrap"
        role="region"
        aria-label="Memory garden"
        data-fullscreen={fullscreen ? "true" : "false"}
        style={{ width: "100%", height }}
      >
        <div
          ref={innerRef}
          className="orbgarden-inner"
          onPointerMove={(event) => {
            const rect = innerRef.current?.getBoundingClientRect();

            if (!rect) {
              return;
            }

            mouseRef.current.x = clamp(event.clientX - rect.left, 0, layoutWidth);
            mouseRef.current.y = clamp(event.clientY - rect.top, 0, layoutHeight);
            mouseRef.current.active = true;
          }}
          onPointerLeave={() => {
            mouseRef.current.active = false;
          }}
        >
          {capsules.map((capsule, index) => {
            const position = anchorPositions[index];
            const body = bodyById.get(capsule.id);
            const left = clamp(((body?.x ?? (position.left / 100) * layoutWidth) / layoutWidth) * 100, 0, 100);
            const top = clamp(((body?.y ?? (position.top / 100) * layoutHeight) / layoutHeight) * 100, 0, 100);

            const unlockMs = new Date(capsule.unlockAt).getTime();
            const isUnlocked = Number.isFinite(unlockMs) ? unlockMs <= nowMs : capsule.unlocked;
            const glowStrength = getGlowStrength(capsule, nowMs);
            const glowRgb = vibrantRgbTripletFromHex(capsule.moodColor);
            const isDragging = draggingId === capsule.id;
            const bloomLevel = isUnlocked ? 1 : Math.max(0.16, glowStrength * 0.66);

            return (
              <button
                key={capsule.id}
                type="button"
                className={`orb-node ${isUnlocked ? "orb-open" : "orb-locked"} ${isDragging ? "orb-dragging" : ""}`}
                title={capsule.title}
                onClick={() => {
                  const suppressUntil = suppressClickUntilRef.current[capsule.id] ?? 0;
                  if (Date.now() < suppressUntil) {
                    return;
                  }

                  onSelect(capsule.id);
                }}
                onPointerDown={(event) => {
                  const rect = innerRef.current?.getBoundingClientRect();
                  const currentBody = bodyById.get(capsule.id);

                  if (!rect || !currentBody) {
                    return;
                  }

                  const pointerX = event.clientX - rect.left;
                  const pointerY = event.clientY - rect.top;

                  dragRef.current = {
                    id: capsule.id,
                    pointerId: event.pointerId,
                    offsetX: currentBody.x - pointerX,
                    offsetY: currentBody.y - pointerY,
                    lastX: currentBody.x,
                    lastY: currentBody.y,
                    lastTime: performance.now(),
                    moved: false,
                  };

                  setDraggingId(capsule.id);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  const drag = dragRef.current;

                  if (!drag || drag.pointerId !== event.pointerId || drag.id !== capsule.id) {
                    return;
                  }

                  const rect = innerRef.current?.getBoundingClientRect();
                  if (!rect) {
                    return;
                  }

                  updateDraggedBody(event.clientX - rect.left, event.clientY - rect.top, performance.now());
                }}
                onPointerUp={(event) => {
                  const drag = dragRef.current;

                  if (!drag || drag.pointerId !== event.pointerId || drag.id !== capsule.id) {
                    return;
                  }

                  if (drag.moved) {
                    suppressClickUntilRef.current[capsule.id] = Date.now() + 240;
                  }

                  dragRef.current = null;
                  setDraggingId((current) => (current === capsule.id ? null : current));

                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onPointerCancel={(event) => {
                  const drag = dragRef.current;

                  if (!drag || drag.pointerId !== event.pointerId || drag.id !== capsule.id) {
                    return;
                  }

                  dragRef.current = null;
                  setDraggingId((current) => (current === capsule.id ? null : current));

                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                style={
                  {
                    left: `${left}%`,
                    top: `${top}%`,
                    ["--glow-rgb" as string]: glowRgb,
                    ["--glow-strength" as string]: glowStrength.toFixed(3),
                    ["--bloom-level" as string]: bloomLevel.toFixed(3),
                    ["--appear-delay" as string]: `${position.delayMs}ms`,
                  } as React.CSSProperties
                }
              >
                <span className="orb-shell">
                  <span className={`orb-flower ${isUnlocked ? "orb-flower-open" : "orb-flower-closed"}`} aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, flowerIndex) => (
                      <span
                        key={flowerIndex}
                        className="flower-petal"
                        style={
                          {
                            ["--flower-angle" as string]: `${flowerIndex * 72}deg`,
                          } as React.CSSProperties
                        }
                      />
                    ))}
                    <span className="flower-core" />
                  </span>
                  <span className="orb-hover-particles" aria-hidden="true" />

                  {bloomingOrbId === capsule.id ? (
                    <span key={`${bloomToken}-${capsule.id}`} className="orb-burst" aria-hidden="true">
                      {Array.from({ length: 12 }).map((_, petalIndex) => (
                        <span
                          key={petalIndex}
                          className="petal"
                          style={
                            {
                              ["--petal-angle" as string]: `${petalIndex * 30}deg`,
                              ["--petal-delay" as string]: `${petalIndex * 20}ms`,
                            } as React.CSSProperties
                          }
                        />
                      ))}
                    </span>
                  ) : null}
                </span>
                <span className="orb-label">{capsule.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .orbgarden-wrap {
          margin: 10px 0 26px;
          width: 100%;
          display: block;
          position: relative;
          overflow: visible;
          font-family: var(--font-typewriter), ui-monospace, monospace;
        }

        .orbgarden-wrap[data-fullscreen="true"] {
          margin: 0;
        }

        .orbgarden-inner {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 240px;
          border-radius: 20px;
          background:
            radial-gradient(circle at 20% 16%, rgba(126, 234, 255, 0.2), transparent 44%),
            radial-gradient(circle at 78% 80%, rgba(255, 183, 226, 0.14), transparent 48%),
            linear-gradient(155deg, rgba(22, 26, 34, 0.82), rgba(4, 7, 12, 0.94));
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        .orbgarden-wrap[data-fullscreen="true"] .orbgarden-inner {
          border-radius: 0;
          border-left: none;
          border-right: none;
        }

        .orb-node {
          position: absolute;
          transform: translate(-50%, -50%);
          border: none;
          background: transparent;
          cursor: grab;
          padding: 0;
          outline: none;
          z-index: 2;
          animation: orb-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: var(--appear-delay);
          touch-action: none;
          will-change: left, top;
        }

        .orb-dragging {
          cursor: grabbing;
          z-index: 4;
        }

        .orb-shell {
          position: relative;
          width: 94px;
          height: 94px;
          border-radius: 9999px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          padding: 8px;
          border: 1px solid rgba(255, 255, 255, calc(0.56 + var(--glow-strength) * 0.24));
          background:
            radial-gradient(circle at 28% 22%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.72) 42%, rgba(255, 255, 255, 0.46) 70%, rgba(255, 255, 255, 0.18) 100%),
            radial-gradient(circle at 74% 82%, rgba(var(--glow-rgb) / 0.56), rgba(var(--glow-rgb) / 0.16) 58%, transparent 76%),
            linear-gradient(155deg, rgba(255, 255, 255, 0.56), rgba(255, 255, 255, 0.2));
          box-shadow:
            0 10px 24px rgba(2, 8, 24, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.74),
            0 0 calc(14px + var(--glow-strength) * 44px) rgba(var(--glow-rgb) / calc(0.28 + var(--glow-strength) * 0.62));
          transition: transform 180ms ease, box-shadow 220ms ease;
          overflow: visible;
          user-select: none;
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }

        .orb-flower {
          position: absolute;
          inset: -2px;
          pointer-events: none;
          z-index: 0;
        }

        .flower-petal {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 16px;
          height: 16px;
          border-radius: 62% 62% 58% 58%;
          background:
            radial-gradient(circle at 38% 30%, rgba(232, 245, 255, 0.95), rgba(161, 214, 255, 0.9) 32%, rgba(var(--glow-rgb) / 0.88) 100%);
          border: 1px solid rgba(233, 247, 255, 0.82);
          transform: translate(-50%, -50%) rotate(var(--flower-angle))
            translateY(calc(-4px - var(--bloom-level) * 9px))
            scale(calc(0.3 + var(--bloom-level) * 0.68));
          opacity: calc(0.32 + var(--bloom-level) * 0.62);
          transition: transform 280ms ease, opacity 280ms ease;
          box-shadow: 0 0 12px rgba(var(--glow-rgb) / 0.48);
        }

        .orb-flower-closed .flower-petal {
          filter: saturate(0.72) brightness(0.92);
        }

        .orb-flower-open .flower-petal {
          border-color: rgba(247, 252, 255, 0.9);
        }

        .flower-core {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 9px;
          height: 9px;
          transform: translate(-50%, -50%) scale(calc(0.5 + var(--bloom-level) * 0.6));
          border-radius: 999px;
          background:
            radial-gradient(circle at 36% 32%, #fff4c2, #facc15 68%, #f59e0b 100%);
          box-shadow: 0 0 8px rgba(250, 204, 21, 0.55);
          border: 1px solid rgba(255, 241, 189, 0.92);
          transition: transform 280ms ease;
        }

        .orb-node:hover .orb-shell {
          transform: scale(1.08);
          box-shadow:
            0 12px 28px rgba(2, 8, 24, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.86),
            0 0 calc(22px + var(--glow-strength) * 48px) rgba(var(--glow-rgb) / calc(0.36 + var(--glow-strength) * 0.66));
        }

        .orb-hover-particles {
          position: absolute;
          inset: -20px;
          pointer-events: none;
          opacity: 0;
          background:
            radial-gradient(circle at 18% 78%, rgba(var(--glow-rgb) / 0.96) 0 2px, transparent 3px),
            radial-gradient(circle at 30% 70%, rgba(var(--glow-rgb) / 0.9) 0 1.8px, transparent 2.8px),
            radial-gradient(circle at 50% 80%, rgba(var(--glow-rgb) / 0.94) 0 2px, transparent 3px),
            radial-gradient(circle at 66% 72%, rgba(var(--glow-rgb) / 0.86) 0 1.8px, transparent 3px),
            radial-gradient(circle at 80% 78%, rgba(255 255 255 / 0.84) 0 1.6px, transparent 2.5px);
          transform: translateY(8px) scale(0.94);
        }

        .orb-node:hover .orb-hover-particles,
        .orb-node:focus-visible .orb-hover-particles {
          opacity: 1;
          animation: particle-rise 920ms linear infinite;
        }

        .orb-dragging .orb-shell {
          transform: scale(1.08);
          box-shadow:
            0 14px 30px rgba(2, 8, 24, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.86),
            0 0 calc(24px + var(--glow-strength) * 52px) rgba(var(--glow-rgb) / calc(0.38 + var(--glow-strength) * 0.68));
        }

        .orb-node:focus-visible .orb-shell {
          box-shadow:
            0 0 0 2px rgba(255, 255, 255, 0.85),
            0 0 calc(18px + var(--glow-strength) * 44px) rgba(var(--glow-rgb) / calc(0.34 + var(--glow-strength) * 0.62));
        }

        .orb-label {
          position: absolute;
          left: 50%;
          top: calc(100% + 8px);
          transform: translateX(-50%);
          max-width: 168px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 600;
          color: #e2e8f0;
          opacity: 0.9;
          pointer-events: none;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.66);
          transition: opacity 140ms ease, color 140ms ease;
        }

        .orb-node:hover .orb-label,
        .orb-node:focus-visible .orb-label {
          opacity: 1;
          color: #f8fafc;
        }

        .orb-locked .orb-shell {
          border-color: rgba(255, 255, 255, 0.46);
          animation: locked-glow 2.8s ease-in-out infinite;
        }

        .orb-open .orb-shell {
          border-color: rgba(255, 255, 255, 0.74);
        }

        .orb-burst {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: visible;
        }

        .petal {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 14px;
          height: 8px;
          border-radius: 999px;
          background: rgba(var(--glow-rgb) / 0.92);
          box-shadow: 0 0 6px rgba(var(--glow-rgb) / 0.74);
          transform: translate(-50%, -50%) rotate(var(--petal-angle)) translateY(0) scale(0.26);
          opacity: 0;
          animation: petal-burst 900ms ease-out forwards;
          animation-delay: var(--petal-delay);
        }

        @keyframes orb-in {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.3);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes petal-burst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--petal-angle)) translateY(0) scale(0.22);
          }
          16% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--petal-angle)) translateY(calc(-54px - var(--glow-strength) * 20px)) scale(0.18);
          }
        }

        @keyframes locked-glow {
          0%,
          100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.09);
          }
        }

        @keyframes particle-rise {
          0% {
            transform: translateY(9px) scale(0.92);
            opacity: 0.28;
          }
          55% {
            opacity: 0.86;
          }
          100% {
            transform: translateY(-12px) scale(1.1);
            opacity: 0;
          }
        }

        @media (max-width: 640px) {
          .orb-shell {
            width: 78px;
            height: 78px;
            padding: 6px;
          }

          .orb-label {
            font-size: 9px;
            max-width: 136px;
          }
        }
      `}</style>
    </>
  );
}
