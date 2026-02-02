import { useState } from 'react';
import { CircleLoaderBlock } from '../../components/circleLoader';
import SearchResultItem, { SearchResultInfo } from '../../components/searchResultItem';
import { API_CALL_STATUSES, ApiCallStatus, ROUTES } from '../../utils/constants';

interface SearchResultsProps {
  apiStatus: ApiCallStatus;
  searchText: string;
  searchResults: SearchResultInfo[];
}

interface HistoryResultRowProps {
  info: SearchResultInfo;
  favourites: SearchResultInfo[];
  onFavouriteClick: (e: React.MouseEvent, info: SearchResultInfo) => void;
}

function HistoryResultRow({ info, favourites, onFavouriteClick }: HistoryResultRowProps) {
  const isFavourite = favourites.some(f => f.id === info.id && f.type === info.type);
  return (
    <SearchResultItem
      info={info}
      linkState={{ from: ROUTES.search, query: '' }}
      isFavourite={isFavourite}
      onFavouriteClick={onFavouriteClick}
    />
  );
}

interface SearchResultRowProps {
  info: SearchResultInfo;
  searchText: string;
  favourites: SearchResultInfo[];
  onFavouriteClick: (e: React.MouseEvent, info: SearchResultInfo) => void;
}

function SearchResultRow({ info, searchText, favourites, onFavouriteClick }: SearchResultRowProps) {
  return (
    <SearchResultItem
      info={info}
      linkState={{ from: ROUTES.search, query: searchText }}
      isFavourite={favourites.some(f => f.id === info.id && f.type === info.type)}
      onFavouriteClick={onFavouriteClick}
    />
  );
}

const SearchResults: React.FC<SearchResultsProps> = ({ apiStatus, searchText, searchResults }) => {
  const [historyItems] = useState<SearchResultInfo[]>(
    JSON.parse(localStorage.getItem('bpt_history') || '[]')
  );
  const [favourites, setFavouritesItems] = useState<SearchResultInfo[]>(
    JSON.parse(localStorage.getItem('bpt_favourites') || '[]')
  );

  const onFavouriteClick = (e: React.MouseEvent, info: SearchResultInfo) => {
    e.stopPropagation();
    e.preventDefault();

    const { id, text, type } = info;
    let newFavourites: SearchResultInfo[] = [];
    if (favourites.some(f => f.id === id && f.type === type)) {
      newFavourites = favourites.filter(f => !(f.id === id && f.type === type));
    } else {
      newFavourites = [{ id, text, type }, ...favourites];
    }
    setFavouritesItems(newFavourites);
    localStorage.setItem('bpt_favourites', JSON.stringify(newFavourites));
  };

  if (apiStatus === API_CALL_STATUSES.PROGRESS) {
    return <CircleLoaderBlock />;
  }

  if (!searchText && historyItems.length > 0) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent</h3>
        <div className="space-y-1">
          {historyItems.map(i => (
            <HistoryResultRow
              key={`${i.id}-${i.text}`}
              info={i}
              favourites={favourites}
              onFavouriteClick={onFavouriteClick}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!searchText) {
    return null;
  }

  if (searchResults.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No results found</div>;
  }

  return (
    <div className="p-4 space-y-1">
      {searchResults.map(i => (
        <SearchResultRow
          key={`${i.id}-${i.text}`}
          info={i}
          searchText={searchText}
          favourites={favourites}
          onFavouriteClick={onFavouriteClick}
        />
      ))}
    </div>
  );
};

export default SearchResults;
