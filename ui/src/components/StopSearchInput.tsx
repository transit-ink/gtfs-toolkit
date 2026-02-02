import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "../utils";
import { StopSearchResult, useSearchStops } from "../utils/api";

function StopSearchResultOption({
  result,
  onSelect,
}: {
  result: StopSearchResult;
  onSelect: (result: StopSearchResult) => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 w-full p-3 hover:bg-accent text-left transition-colors"
      onClick={() => onSelect(result)}
    >
      <MapPin className="w-5 h-5 text-blue-500 shrink-0" />
      <span className="text-sm truncate">{result.stop.stop_name}</span>
    </button>
  );
}

interface SelectedStop {
  stop_id: string;
  stop_name: string;
}

interface StopSearchInputProps {
  placeholder?: string;
  value: SelectedStop | null;
  onChange: (stop: SelectedStop | null) => void;
}

const StopSearchInput: React.FC<StopSearchInputProps> = ({
  placeholder = "Search for a stop",
  value,
  onChange,
}) => {
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearchText = useDebouncedValue(searchText, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results = [], isFetching: isLoading } = useSearchStops(debouncedSearchText);
  const showResults = !!debouncedSearchText && !value;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (stop: StopSearchResult) => {
    onChange({
      stop_id: stop.stop.stop_id,
      stop_name: stop.stop.stop_name,
    });
    setSearchText("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearchText("");
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 p-3 bg-accent border border-border rounded-lg min-h-[48px]">
        <MapPin className="w-5 h-5 text-blue-500 shrink-0" />
        <span className="flex-1 truncate">{value.stop_name}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleClear}
          className="shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-3 border border-input rounded-lg bg-background min-h-[48px]">
        <MapPin className="w-5 h-5 text-muted-foreground shrink-0 ml-3" />
        <input
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={
            cn(
              "flex-1 bg-transparent outline-none pr-3 placeholder:text-muted-foreground",
              value ? "py-2" : "py-4"
            )
          }
        />
      </div>
      
      {isOpen && (searchText || isLoading) && showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {isLoading && (
            <div className="p-3 text-center text-muted-foreground text-sm">
              Searching...
            </div>
          )}
          
          {!isLoading && results.length === 0 && debouncedSearchText && (
            <div className="p-3 text-center text-muted-foreground text-sm">
              No stops found
            </div>
          )}
          
          {!isLoading && results.map((result) => (
            <StopSearchResultOption
              key={result.stop.stop_id}
              result={result}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StopSearchInput;
