import { Star } from 'lucide-react';
import { useState } from 'react';
import SearchResultItem, { SearchResultInfo } from '../../components/searchResultItem';
import Sidebar from '../../components/sidebar';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ROUTES } from '../../utils/constants';

export default function FavouritesPage() {
  usePageMeta({
    title: 'Favourites',
    description: 'Your saved favourite bus and metro routes and stops for quick access.',
  });
  const [favourites, setFavourites] = useState<SearchResultInfo[]>(() =>
    JSON.parse(localStorage.getItem('bpt_favourites') || '[]')
  );

  const removeFromFavourites = (e: React.MouseEvent, info: SearchResultInfo) => {
    e.stopPropagation();
    e.preventDefault();

    const { id, type } = info;
    const newFavourites = favourites.filter(f => !(f.id === id && f.type === type));
    setFavourites(newFavourites);
    localStorage.setItem('bpt_favourites', JSON.stringify(newFavourites));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 bg-primary text-primary-foreground p-4">
        <Sidebar />
        <h1 className="text-lg font-semibold flex-1">Favourites</h1>
      </div>

      {/* Content */}
      <div className="p-4">
        {favourites.length > 0 ? (
          <div className="space-y-1">
            {favourites.map(item => (
              <SearchResultItem
                key={`${item.id}-${item.text}`}
                info={item}
                isFavourite
                linkState={{ from: ROUTES.favourites, query: '' }}
                onFavouriteClick={removeFromFavourites}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <Star className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-foreground font-medium">No favourites yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
              Tap the star icon on any route or stop to save it here for quick access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
