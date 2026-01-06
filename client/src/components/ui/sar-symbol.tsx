import sarSymbolImg from "@/assets/sar-symbol.png";

interface SARSymbolProps {
  className?: string;
  size?: number;
}

export function SARSymbol({ className = "", size = 16 }: SARSymbolProps) {
  return (
    <img
      src={sarSymbolImg}
      alt="SAR"
      width={size}
      height={size}
      className={`inline-block align-middle dark:invert ${className}`}
      style={{ objectFit: 'contain' }}
    />
  );
}

export function SARText({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <SARSymbol size={14} />
    </span>
  );
}
