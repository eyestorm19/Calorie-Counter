import { useDate } from '../contexts/DateContext';

interface DayNavigatorProps {
  datesWithData?: string[];  // YYYY-MM-DD dates that have logged data
}

/** Returns the past 7 days ending today (oldest first). */
function getPastSevenDays(todayKey: string): { dateKey: string; dayName: string; dayNum: string }[] {
  const today = new Date(todayKey + 'T12:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dateKey = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const dayNum = d.getDate().toString();
    return { dateKey, dayName, dayNum };
  });
}

export default function DayNavigator({ datesWithData = [] }: DayNavigatorProps) {
  const { dbKey, todayDbKey, setSelectedDate } = useDate();
  const todayKey = todayDbKey || new Date().toISOString().split('T')[0];
  const weekDays = getPastSevenDays(todayKey);

  return (
    <div className="day-navigator" role="tablist" aria-label="Select day to view">
      {weekDays.map(({ dateKey, dayName, dayNum }) => {
        const isSelected = dateKey === dbKey;
        const isToday = dateKey === todayDbKey;
        const hasData = datesWithData.includes(dateKey);

        return (
          <button
            key={dateKey}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={`${dayName} ${dayNum}${isToday ? ', Today' : ''}`}
            className={`day-nav-item ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
            onClick={() => setSelectedDate(dateKey)}
          >
            <span className="day-nav-label">{dayName}</span>
            <span className="day-nav-num">{dayNum}</span>
            {hasData && <span className="day-nav-dot" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
