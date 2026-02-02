import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../assets/logo_white.svg';
import SearchResultItem, { SearchResultInfo } from '../../components/searchResultItem';
import Sidebar from '../../components/sidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Group, useGroupsBulk } from '../../utils/api';
import { HOSTNAME, ROUTES, availableInstances, currentInstance } from '../../utils/constants';

// Illustration components for quick actions
const SearchIllustration = () => (
  <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
    <circle cx="22" cy="22" r="12" stroke="#3B82F6" strokeWidth="2.5" fill="#EFF6FF" />
    <line
      x1="31"
      y1="31"
      x2="40"
      y2="40"
      stroke="#3B82F6"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="22" cy="22" r="5" fill="#BFDBFE" />
  </svg>
);

const PlanTripIllustration = () => (
  <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
    <circle cx="12" cy="14" r="5" fill="#BBF7D0" stroke="#22C55E" strokeWidth="2" />
    <circle cx="36" cy="34" r="5" fill="#BBF7D0" stroke="#22C55E" strokeWidth="2" />
    <path
      d="M16 18L24 26L32 30"
      stroke="#22C55E"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="3 3"
    />
    <circle cx="12" cy="14" r="2" fill="#22C55E" />
    <circle cx="36" cy="34" r="2" fill="#22C55E" />
  </svg>
);

const ExploreIllustration = () => (
  <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
    <circle cx="24" cy="24" r="18" fill="#FAF5FF" stroke="#A855F7" strokeWidth="2" />
    <circle cx="24" cy="24" r="3" fill="#A855F7" />
    <circle cx="16" cy="18" r="2.5" fill="#C084FC" />
    <circle cx="32" cy="20" r="2.5" fill="#C084FC" />
    <circle cx="28" cy="32" r="2.5" fill="#C084FC" />
    <circle cx="18" cy="30" r="2" fill="#D8B4FE" />
  </svg>
);

interface InstanceSelectItemProps {
  instance: { id: string; name: string };
}

function InstanceSelectItem({ instance }: InstanceSelectItemProps) {
  return <SelectItem value={instance.id}>{instance.name}</SelectItem>;
}

interface FeaturedGroupRowProps {
  group: { id: string; icon: React.ComponentType };
  groupData: Group;
}

function FeaturedGroupRow({ group, groupData }: FeaturedGroupRowProps) {
  return (
    <Link
      to={`/group/${group.id}`}
      className="flex items-center gap-4 p-3 hover:bg-accent rounded-lg transition-colors"
    >
      <group.icon />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{groupData.name}</p>
        {groupData.description && (
          <p className="text-sm text-muted-foreground">{groupData.description}</p>
        )}
      </div>
    </Link>
  );
}

interface HomeHistoryRowProps {
  item: SearchResultInfo;
  favourites: SearchResultInfo[];
  onFavouriteClick: (e: React.MouseEvent, info: SearchResultInfo) => void;
}

function HomeHistoryRow({ item, favourites, onFavouriteClick }: HomeHistoryRowProps) {
  const isFavourite = favourites.some(f => f.id === item.id && f.type === item.type);
  return (
    <SearchResultItem
      info={item}
      isFavourite={isFavourite}
      linkState={{ from: ROUTES.home, query: '' }}
      onFavouriteClick={onFavouriteClick}
    />
  );
}

interface HomeFavouriteRowProps {
  item: SearchResultInfo;
  onFavouriteClick: (e: React.MouseEvent, info: SearchResultInfo) => void;
}

function HomeFavouriteRow({ item, onFavouriteClick }: HomeFavouriteRowProps) {
  return (
    <SearchResultItem
      info={item}
      isFavourite
      linkState={{ from: ROUTES.home, query: '' }}
      onFavouriteClick={onFavouriteClick}
    />
  );
}

export default function HomePage() {
  usePageMeta({
    title: 'Bus & Metro Routes',
    // description omitted so instance default is used (BLR: BMTC/BMRCL, HYD: TGSRTC/HMRL)
  });
  const [historyItems] = useState<SearchResultInfo[]>(() =>
    JSON.parse(localStorage.getItem('bpt_history') || '[]').slice(0, 10)
  );
  const [favourites, setFavourites] = useState<SearchResultInfo[]>(() =>
    JSON.parse(localStorage.getItem('bpt_favourites') || '[]')
  );
  const featuredIds = (currentInstance.featuredGroups ?? []).map(g => g.id);
  const { data: featuredGroupsList = [] } = useGroupsBulk(featuredIds);
  const featuredGroupsData: Record<string, Group> = featuredGroupsList.length
    ? Object.fromEntries(featuredGroupsList.map(g => [g.group_id, g]))
    : {};

  const handleInstanceChange = (value: string) => {
    const nextInstance = availableInstances.find(instance => instance.id === value);
    if (!nextInstance || nextInstance.hostname === HOSTNAME) return;

    const url = new URL(window.location.href);
    url.hostname = nextInstance.hostname;

    if (!nextInstance.isDev) {
      url.protocol = 'https:';
      url.port = '';
    }

    window.location.href = url.toString();
  };

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
    setFavourites(newFavourites);
    localStorage.setItem('bpt_favourites', JSON.stringify(newFavourites));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with logo */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center gap-3">
          <Sidebar />
          <div className="flex items-center gap-2">
            <img src={Logo} alt="Transit Ink" className="h-4" />
            <Select value={currentInstance.id} onValueChange={handleInstanceChange}>
              <SelectTrigger className="h-7 w-[7.5rem] bg-primary/80 border-primary-foreground/40 text-xs text-primary-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableInstances.map(instance => (
                  <InstanceSelectItem key={instance.id} instance={instance} />
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-8">
        {/* Quick Actions */}
        <div className="space-y-3">
          <Link
            to={ROUTES.search}
            className="flex items-center gap-4 p-4 rounded-xl border border-blue-200 bg-card hover:bg-accent/50 transition-colors"
          >
            <SearchIllustration />
            <div>
              <h3 className="font-semibold text-foreground">Search</h3>
              <p className="text-sm text-muted-foreground">Find bus routes or stops</p>
            </div>
          </Link>
          <Link
            to={ROUTES.plan}
            className="flex items-center gap-4 p-4 rounded-xl border border-green-200 bg-card hover:bg-accent/50 transition-colors"
          >
            <PlanTripIllustration />
            <div>
              <h3 className="font-semibold text-foreground">Plan Trip</h3>
              <p className="text-sm text-muted-foreground">Find route between two stops</p>
            </div>
          </Link>
          <Link
            to={ROUTES.explore}
            className="flex items-center gap-4 p-4 rounded-xl border border-purple-200 bg-card hover:bg-accent/50 transition-colors"
          >
            <ExploreIllustration />
            <div>
              <h3 className="font-semibold text-foreground">Explore</h3>
              <p className="text-sm text-muted-foreground">Browse stops nearby you</p>
            </div>
          </Link>
        </div>

        {/* Popular Info */}
        {currentInstance.featuredGroups.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Popular info</h2>
            <div className="space-y-1">
              {currentInstance.featuredGroups.map(group => {
                const groupData = featuredGroupsData[group.id];
                if (!groupData) return null;
                return (
                  <FeaturedGroupRow
                    key={group.id}
                    group={group}
                    groupData={groupData}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Recent */}
        {historyItems.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Recent</h2>
            <div className="space-y-1">
              {historyItems.map(item => (
                <HomeHistoryRow
                  key={`${item.id}-${item.text}`}
                  item={item}
                  favourites={favourites}
                  onFavouriteClick={onFavouriteClick}
                />
              ))}
            </div>
          </section>
        )}

        {/* Favourites */}
        {favourites.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Favourites</h2>
            <div className="space-y-1">
              {favourites.map(item => (
                <HomeFavouriteRow
                  key={`${item.id}-${item.text}`}
                  item={item}
                  onFavouriteClick={onFavouriteClick}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
