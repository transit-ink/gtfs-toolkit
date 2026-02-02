import { Loader2 } from "lucide-react";

interface CircleLoaderProps {
  text?: string;
}

const CircleLoader: React.FC<CircleLoaderProps> = ({ text }) => {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">{text || "Loading..."}</span>
    </div>
  );
};

export const CircleLoaderBlock: React.FC<CircleLoaderProps> = ({ text }) => {
  return (
    <div className="flex items-center justify-center p-8">
      <CircleLoader text={text} />
    </div>
  );
};

export default CircleLoader;
