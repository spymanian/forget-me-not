"use client";

export default function LogoFlower({
  width = 100,
  height = 100,
}: {
  width?: number;
  height?: number;
}) {
  // single flower with six petals around a center
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {[0, 60, 120, 180, 240, 300].map((a, i) => {
        const x = (50 + 30 * Math.cos((a * Math.PI) / 180)).toFixed(6);
        const y = (50 + 30 * Math.sin((a * Math.PI) / 180)).toFixed(6);
        return (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx="12"
            ry="16"
            transform={`rotate(${a} ${x} ${y})`}
            fill="#93c5fd"
            opacity="0.9"
          />
        );
      })}
      <circle cx="50" cy="50" r="30" fill="#bfdbfe" />
      <circle cx="50" cy="50" r="12" fill="#fef9c3" />
    </svg>
  );
}
