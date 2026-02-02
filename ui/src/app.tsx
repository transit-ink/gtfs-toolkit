import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import ExplorePage from './pages/explore';
import FavouritesPage from './pages/favourites';
import GroupPage from './pages/group';
import HomePage from './pages/home';
import PlanPage from './pages/plan';
import TripResultPage from './pages/plan/result';
import RoutePage from './pages/route';
import SearchPage from './pages/search';
import StopPage from './pages/stop';
import { pageview } from './utils/analytics';

const GaPageView = () => {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname + location.search;
    pageview(path);
  }, [location.pathname, location.search]);
  return null;
};

const App = () => {
  return (
    <BrowserRouter>
      <GaPageView />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/route/*" element={<RoutePage />} />
        <Route path="/stop/:stopId" element={<StopPage />} />
        <Route path="/group/:groupId" element={<GroupPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/plan/result" element={<TripResultPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/favourites" element={<FavouritesPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
