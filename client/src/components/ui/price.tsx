import sarSymbolImg from "@/assets/sar-symbol.png";

interface PriceProps {
  amount: number | string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { text: "text-sm", icon: 12 },
  md: { text: "text-base", icon: 14 },
  lg: { text: "text-2xl font-bold", icon: 18 },
};

export function Price({ amount, className = "", size = "md" }: PriceProps) {
  const { text, icon } = sizes[size];
  return (
    <span className={`inline-flex items-center gap-1 ${text} ${className}`}>
      <span>{amount}</span>
      <img
        src={sarSymbolImg}
        alt="SAR"
        width={icon}
        height={icon}
        className="inline-block align-middle dark:invert"
        style={{ objectFit: 'contain' }}
      />
    </span>
  );
}

export function SARIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
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
