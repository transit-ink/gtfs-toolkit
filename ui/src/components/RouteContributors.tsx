import { Users } from 'lucide-react';
import { useRouteContributors } from '../utils/api';

interface RouteContributorsProps {
  routeId: string;
}

function ContributorAvatar({ username }: { username: string }) {
  return (
    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

export function RouteContributors({ routeId }: RouteContributorsProps) {
  const { data: contributors, isLoading, error } = useRouteContributors(routeId);

  // Don't render anything if loading, error, or no contributors
  if (isLoading || error || !contributors || contributors.length === 0) {
    return null;
  }

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Contributors</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {contributors.map(contributor => (
          <div
            key={contributor.userId}
            className="flex items-center gap-2 bg-muted/50 rounded-full pl-1 pr-3 py-1"
          >
            <ContributorAvatar username={contributor.username} />
            <span className="text-sm">{contributor.username}</span>
            <span className="text-xs text-muted-foreground">({contributor.changeCount})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
