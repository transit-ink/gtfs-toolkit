import { Link } from "react-router-dom";
import { Bus, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEARCH_RESULT_TYPES, SearchResultType } from "../utils/constants";

export interface SearchResultInfo {
  type: SearchResultType;
  id: string;
  text: string;
}

interface LinkState {
  from: string;
  query: string;
}

interface SearchResultItemProps {
  info: SearchResultInfo;
  isFavourite?: boolean;
  linkState: LinkState;
  onItemClick?: (info: SearchResultInfo) => void;
  onFavouriteClick: (e: React.MouseEvent, info: SearchResultInfo) => void;
}

const IconForResultType: Record<SearchResultType, React.ReactNode> = {
  [SEARCH_RESULT_TYPES.bus_stop]: <MapPin className="w-5 h-5 text-blue-500" />,
  [SEARCH_RESULT_TYPES.bus_number]: <Bus className="w-5 h-5 text-green-500" />,
  [SEARCH_RESULT_TYPES.metro_station_green]: <MapPin className="w-5 h-5 text-green-600" />,
  [SEARCH_RESULT_TYPES.metro_station_purple]: <MapPin className="w-5 h-5 text-purple-600" />,
  [SEARCH_RESULT_TYPES.location]: <MapPin className="w-5 h-5 text-muted-foreground" />,
};

const getLink = (info: SearchResultInfo): string => {
  if (info.type === SEARCH_RESULT_TYPES.bus_stop) {
    return `/stop/${info.id}`;
  }
  return `/route/${info.id}`;
};

const SearchResultItem: React.FC<SearchResultItemProps> = ({
  info,
  isFavourite = false,
  linkState,
  onItemClick = () => {},
  onFavouriteClick,
}) => {
  return (
    <Link
      state={linkState}
      className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors"
      to={getLink(info)}
      onClick={() => onItemClick(info)}
    >
      {IconForResultType[info.type]}
      <div className="flex-1 min-w-0">
        <span className="block truncate text-sm">{info.text}</span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={(e) => onFavouriteClick(e, info)}
      >
        <Star
          className={`w-4 h-4 ${isFavourite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
        />
      </Button>
    </Link>
  );
};

export default SearchResultItem;
