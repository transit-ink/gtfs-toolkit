import { Input } from '@/components/ui/input';
import { useEffect, useMemo, useState } from 'react';
import { SearchResultInfo } from '../../components/searchResultItem';
import Sidebar from '../../components/sidebar';
import { usePageMeta } from '../../hooks/usePageMeta';
import { trackSearch } from '../../utils/analytics';
import {
  deleteUrlParameter,
  getUrlParameter,
  setUrlParameter,
  useDebouncedValue,
} from '../../utils';
import { RouteSearchResult, SearchResult, useSearchResults } from '../../utils/api';
import { API_CALL_STATUSES, ApiCallStatus, SEARCH_RESULT_TYPES } from '../../utils/constants';
import SearchResults from './searchResults';

const isRouteResult = (result: SearchResult): result is RouteSearchResult => {
  return 'route' in result;
};

export default function SearchPage() {
  usePageMeta({
    title: 'Search',
    description:
      'Search for bus and metro routes and stops. Find buses by route number or stop name.',
  });
  const [searchText, setSearchText] = useState<string>(getUrlParameter('q') || '');
  const debouncedSearchText = useDebouncedValue(searchText, 500);

  const { data: results = [], status, isFetching } = useSearchResults(debouncedSearchText);

  const searchResults: SearchResultInfo[] = useMemo(() => {
    if (!debouncedSearchText) return [];
    return results
      .filter((r: SearchResult) => {
        if (!isRouteResult(r) && r.stop.parent_station) return false;
        return true;
      })
      .sort((a: SearchResult, b: SearchResult) => b.score - a.score)
      .map((r: SearchResult) => {
        if (isRouteResult(r)) {
          return {
            type: SEARCH_RESULT_TYPES.bus_number,
            text: r.route.route_long_name
              ? `${r.route.route_short_name} - ${r.route.route_long_name}`
              : r.route.route_short_name,
            id: r.route.route_id,
          };
        }
        return {
          type: SEARCH_RESULT_TYPES.bus_stop,
          text: r.stop.stop_name,
          id: r.stop.stop_id,
        };
      });
  }, [debouncedSearchText, results]);

  const apiStatus: ApiCallStatus = useMemo(() => {
    if (!searchText) return API_CALL_STATUSES.INITIAL;
    if (isFetching || status === 'pending') return API_CALL_STATUSES.PROGRESS;
    if (status === 'error') return API_CALL_STATUSES.ERROR;
    return API_CALL_STATUSES.SUCCESS;
  }, [searchText, status, isFetching]);

  useEffect(() => {
    if (searchText) {
      const newParams = setUrlParameter('q', searchText);
      history.replaceState('', '', `?${newParams.toString()}`);
    } else {
      deleteUrlParameter('q');
      history.replaceState('', '', window.location.href.split('?')[0]);
    }
  }, [searchText]);

  useEffect(() => {
    if (debouncedSearchText.trim()) {
      trackSearch(debouncedSearchText);
    }
  }, [debouncedSearchText]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 bg-primary p-3">
        <Sidebar />
        <Input
          className="flex-1 bg-primary-foreground/10 border-none text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:ring-primary-foreground/30"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Search for a bus, or bus stop"
          autoFocus
        />
      </div>

      {/* Results */}
      <SearchResults apiStatus={apiStatus} searchText={searchText} searchResults={searchResults} />
    </div>
  );
}
