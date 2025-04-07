import { memo } from "react";
import { Loader2 } from "lucide-react";

const LoadingSpinner = memo(() => (
  <div className="flex h-[50vh] items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
));

LoadingSpinner.displayName = "LoadingSpinner";

export default LoadingSpinner;
