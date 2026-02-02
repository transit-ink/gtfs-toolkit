import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MapPin, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { searchStops } from '@/services/stops';
import { Stop } from '@/types/gtfs';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

interface SelectedStop {
  stop_id: string;
  stop_name: string;
}

interface StopSearchInputProps {
  placeholder?: string;
  value: SelectedStop | null;
  onChange: (stop: SelectedStop | null) => void;
}

function StopSearchResultItem({
  result,
  onSelect,
}: {
  result: Stop;
  onSelect: (stop: Stop) => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 w-full p-3 hover:bg-accent text-left transition-colors"
      onClick={() => onSelect(result)}
    >
      <MapPin className="w-5 h-5 text-blue-500 shrink-0" />
      <span className="text-sm truncate">{result.stop_name}</span>
    </button>
  );
}

export function StopSearchInput({
  placeholder = 'Search for a stop',
  value,
  onChange,
}: StopSearchInputProps) {
  const [searchText, setSearchText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<Stop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchText = useDebouncedValue(searchText, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debouncedSearchText || value) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const stops = await searchStops(debouncedSearchText);
        setResults(stops);
      } catch (error) {
        console.error('Error searching stops:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedSearchText, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (stop: Stop) => {
    onChange({
      stop_id: stop.stop_id,
      stop_name: stop.stop_name,
    });
    setSearchText('');
    setIsOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    onChange(null);
    setSearchText('');
    setResults([]);
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 p-3 bg-accent border border-border rounded-lg min-h-[48px]">
        <MapPin className="w-5 h-5 text-blue-500 shrink-0" />
        <span className="flex-1 truncate">{value.stop_name}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="shrink-0 h-8 w-8"
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
        <Input
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            'flex-1 bg-transparent border-0 outline-none pr-3 placeholder:text-muted-foreground',
            value ? 'py-2' : 'py-4'
          )}
        />
      </div>

      {isOpen && (searchText || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {isLoading && (
            <div className="p-3 text-center text-muted-foreground text-sm">Searching...</div>
          )}

          {!isLoading && results.length === 0 && searchText && (
            <div className="p-3 text-center text-muted-foreground text-sm">No stops found</div>
          )}

          {!isLoading &&
            results.map((result) => (
              <StopSearchResultItem
                key={result.stop_id}
                result={result}
                onSelect={handleSelect}
              />
            ))}
        </div>
      )}
    </div>
  );
}
