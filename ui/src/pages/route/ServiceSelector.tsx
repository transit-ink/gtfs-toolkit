import { capitalize } from 'lodash';
import type { Calendar } from '../../types/gtfs';

interface ServiceOption {
  serviceId: string;
  tripsCount: number;
  calendar?: Calendar;
}

interface RouteServiceSelectorProps {
  services: ServiceOption[];
  selectedServiceId: string | null;
  onSelectService: (serviceId: string) => void;
}

interface ServiceOptionRowProps {
  service: ServiceOption;
  selected: boolean;
  onSelect: () => void;
}

function ServiceOptionRow({ service, selected, onSelect }: ServiceOptionRowProps) {
  return (
    <label
      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
      htmlFor={`service-${service.serviceId}`}
    >
      <input
        id={`service-${service.serviceId}`}
        type="radio"
        name="service"
        value={service.serviceId}
        checked={selected}
        onChange={onSelect}
        className="w-4 h-4 text-primary accent-primary shrink-0"
      />
      <div className="flex flex-col min-w-0">
        <span className="text-sm truncate">{formatServiceLabel(service)}</span>
        <span className="text-xs text-muted-foreground">
          {service.tripsCount} trip{service.tripsCount === 1 ? '' : 's'}
        </span>
      </div>
    </label>
  );
}

function formatServiceLabel(option: ServiceOption): string {
  const { serviceId, calendar } = option;
  if (!calendar) return serviceId;

  const days = [
    calendar.monday ? 'Mon' : null,
    calendar.tuesday ? 'Tue' : null,
    calendar.wednesday ? 'Wed' : null,
    calendar.thursday ? 'Thu' : null,
    calendar.friday ? 'Fri' : null,
    calendar.saturday ? 'Sat' : null,
    calendar.sunday ? 'Sun' : null,
  ].filter(Boolean);

  if (days.length === 0) return capitalize(serviceId);

  return `${capitalize(serviceId)} (${days.join(', ')})`;
}

export default function RouteServiceSelector({
  services,
  selectedServiceId,
  onSelectService,
}: RouteServiceSelectorProps) {
  if (!services || services.length <= 1) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">Service</h2>
      <div className="space-y-1">
        {services.map(service => (
          <ServiceOptionRow
            key={service.serviceId}
            service={service}
            selected={selectedServiceId === service.serviceId}
            onSelect={() => onSelectService(service.serviceId)}
          />
        ))}
      </div>
    </section>
  );
}
