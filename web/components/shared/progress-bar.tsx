interface ProgressBarProps {
  value: number;
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs font-semibold mb-1.5">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-bold text-foreground">{width}%</span>
        </div>
      )}
      <div className="w-full bg-secondary rounded-full h-2" role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100}>
        <div className="bg-success h-2 rounded-full transition-all duration-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
