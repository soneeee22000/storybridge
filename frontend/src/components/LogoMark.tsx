import type { ReactNode } from "react";

export function LogoMark({ size = 36 }: { size?: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="logo-mark"
      aria-hidden="true"
    >
      <path
        d="M4 24C4 24 8 8 16 8"
        stroke="#c67a4a"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M28 24C28 24 24 8 16 8"
        stroke="#c67a4a"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M6 22Q16 14 26 22"
        stroke="#4a3228"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="16" cy="8" r="2.5" fill="#c67a4a" />
      <line
        x1="8"
        y1="17"
        x2="13"
        y2="13"
        stroke="#3d6b4f"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <line
        x1="9"
        y1="20"
        x2="14"
        y2="15.5"
        stroke="#3d6b4f"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <line
        x1="24"
        y1="17"
        x2="19"
        y2="13"
        stroke="#d4a843"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <line
        x1="23"
        y1="20"
        x2="18"
        y2="15.5"
        stroke="#d4a843"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}
