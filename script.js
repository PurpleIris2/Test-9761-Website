const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));
const heroSlides = Array.from(document.querySelectorAll('.hero-photo'));
const heroSlideIndicator = document.querySelector('.hero-slide-indicator');
const heroSlideMarkers = Array.from(heroSlideIndicator.querySelectorAll('span'));
let activeHeroSlide = 0;

function showHeroSlide(index) {
  activeHeroSlide = (index + heroSlides.length) % heroSlides.length;
  heroSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle('is-active', slideIndex === activeHeroSlide);
    heroSlideMarkers[slideIndex].classList.toggle('is-active', slideIndex === activeHeroSlide);
  });
  heroSlideIndicator.setAttribute('aria-label', `Photo ${activeHeroSlide + 1} of ${heroSlides.length}`);
}

document.querySelector('[data-hero-prev]').addEventListener('click', () => showHeroSlide(activeHeroSlide - 1));
document.querySelector('[data-hero-next]').addEventListener('click', () => showHeroSlide(activeHeroSlide + 1));

if (heroSlides.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  window.setInterval(() => {
    if (document.hidden || document.querySelector('#panel-about').hidden) return;
    showHeroSlide(activeHeroSlide + 1);
  }, 7000);
}

function activateTab(name, options = {}) {
  const activeIndex = tabs.findIndex((tab) => tab.dataset.tab === name);
  if (activeIndex < 0) return;

  tabs.forEach((tab, index) => {
    const isActive = index === activeIndex;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });

  panels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== name;
  });

  if (options.focus) tabs[activeIndex].focus();
  if (options.scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  tab.addEventListener('keydown', (event) => {
    const currentIndex = tabs.indexOf(tab);
    let nextIndex;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;

    if (nextIndex !== undefined) {
      event.preventDefault();
      activateTab(tabs[nextIndex].dataset.tab, { focus: true });
    }
  });
});

document.querySelectorAll('[data-go]').forEach((button) => {
  button.addEventListener('click', () => {
    activateTab(button.dataset.go, { scroll: true });
  });
});

document.querySelectorAll('[data-home]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    activateTab('about', { scroll: true });
  });
});

document.querySelector('.site-footer button').addEventListener('click', () => {
  activateTab('about', { scroll: true });
});

const calendarDays = document.querySelector('#calendar-days');
const calendarMonthLabel = document.querySelector('#calendar-month');
const selectedDayTitle = document.querySelector('#selected-day-title');
const selectedDayEvents = document.querySelector('#selected-day-events');
const calendarEmpty = document.querySelector('#calendar-empty');
const upcomingEventsList = document.querySelector('#upcoming-events-list');
const upcomingEventsEmpty = document.querySelector('#upcoming-events-empty');
const recentHighlightsList = document.querySelector('#recent-highlights-list');
const recentHighlightsEmpty = document.querySelector('#recent-highlights-empty');
const calendarSection = document.querySelector('.calendar-section');
const calendarMessage = document.querySelector('#calendar-message');
const mainCalendarFilter = document.querySelector('#calendar-filter-main');
const teamCalendarFilter = document.querySelector('#calendar-filter-team');
const today = new Date();
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = toDateKey(today);
let events = [];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateKey, options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, options).format(new Date(year, month - 1, day, 12));
}

function setCalendarMessage(message) {
  calendarMessage.textContent = message;
}

function eventOccursOnDate(event, dateKey) {
  if (dateKey < event.date) return false;
  if (!event.recurrence) return dateKey === event.date;
  if (dateKey > event.recurrence.until) return false;

  const [startYear, startMonth, startDay] = event.date.split('-').map(Number);
  const [year, month, day] = dateKey.split('-').map(Number);
  const interval = event.recurrence.interval;

  if (event.recurrence.unit === 'month') {
    const monthsApart = (year - startYear) * 12 + month - startMonth;
    return day === startDay && monthsApart % interval === 0;
  }

  const startTimestamp = Date.UTC(startYear, startMonth - 1, startDay);
  const timestamp = Date.UTC(year, month - 1, day);
  const daysApart = (timestamp - startTimestamp) / 86400000;
  if (event.recurrence.unit === 'week') {
    return daysApart % 7 === 0 && (daysApart / 7) % interval === 0;
  }
  return daysApart % interval === 0;
}

function dateFromKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatTime(time) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(`2000-01-01T${time}:00`)
  );
}

function upcomingEventInstances() {
  const startDate = toDateKey(today);
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
  const endDateKey = toDateKey(endDate);
  const instances = [];

  events.filter((event) => event.mainEvents).forEach((event) => {
    const firstDate = event.date > startDate ? event.date : startDate;
    if (firstDate > endDateKey || (event.recurrence && firstDate > event.recurrence.until)) return;

    const date = dateFromKey(firstDate);
    while (toDateKey(date) <= endDateKey && (!event.recurrence || toDateKey(date) <= event.recurrence.until)) {
      const dateKey = toDateKey(date);
      if (eventOccursOnDate(event, dateKey)) instances.push({ event, date: dateKey });
      date.setDate(date.getDate() + 1);
    }
  });

  return instances.sort((a, b) => a.date.localeCompare(b.date) || a.event.time.localeCompare(b.event.time));
}

function mostRecentPastOccurrence(event, todayKey) {
  if (event.date >= todayKey) return null;
  if (!event.recurrence) return event.date;

  const yesterday = dateFromKey(todayKey);
  yesterday.setDate(yesterday.getDate() - 1);
  let dateKey = toDateKey(yesterday);
  if (event.recurrence.until < dateKey) dateKey = event.recurrence.until;
  const date = dateFromKey(dateKey);
  const startDate = dateFromKey(event.date);

  while (date >= startDate) {
    const occurrenceDate = toDateKey(date);
    if (eventOccursOnDate(event, occurrenceDate)) return occurrenceDate;
    date.setDate(date.getDate() - 1);
  }
  return null;
}

function createEventCard(event, dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const card = document.createElement('a');
  const datePanel = document.createElement('div');
  const monthLabel = document.createElement('span');
  const dayLabel = document.createElement('strong');
  const yearLabel = document.createElement('span');
  const info = document.createElement('div');
  const status = document.createElement('span');
  const statusDot = document.createElement('i');
  const title = document.createElement('h3');
  const details = document.createElement('p');
  const time = document.createElement('span');
  const arrow = document.createElement('span');
  const date = dateFromKey(dateKey);

  card.href = '#calendar-title';
  card.className = 'past-event-card';
  card.dataset.calendarDate = dateKey;
  card.setAttribute('aria-label', `View ${event.title} on ${formatDate(dateKey)} in the calendar`);

  datePanel.className = 'past-event-date';
  monthLabel.textContent = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date).toUpperCase();
  dayLabel.textContent = String(day).padStart(2, '0');
  yearLabel.textContent = String(year);
  datePanel.append(monthLabel, dayLabel, yearLabel);

  info.className = 'past-event-info';
  status.className = 'event-status';
  statusDot.setAttribute('aria-hidden', 'true');
  status.append(statusDot, document.createTextNode(' MAIN EVENT'));
  title.textContent = event.title;
  time.className = 'event-card-time';
  time.textContent = `${formatTime(event.time)}–${formatTime(event.endTime)}`;
  details.textContent = event.description;
  info.append(status, title, details, time);

  arrow.className = 'resource-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';
  card.append(datePanel, info, arrow);

  return card;
}

function renderEventSections() {
  const upcoming = upcomingEventInstances();
  const past = events
    .filter((event) => event.mainEvents)
    .map((event) => ({ event, date: mostRecentPastOccurrence(event, toDateKey(today)) }))
    .filter((instance) => instance.date)
    .sort((a, b) => b.date.localeCompare(a.date) || a.event.time.localeCompare(b.event.time));

  upcomingEventsList.replaceChildren(...upcoming.map(({ event, date }) => createEventCard(event, date, 'upcoming')));
  upcomingEventsEmpty.hidden = upcoming.length > 0;
  recentHighlightsList.replaceChildren(...past.map(({ event, date }) => createEventCard(event, date, 'past')));
  recentHighlightsEmpty.hidden = past.length > 0;
}

function eventsForDate(dateKey) {
  return events
    .filter((event) => eventOccursOnDate(event, dateKey) && (
      (mainCalendarFilter.checked && event.mainEvents) ||
      (teamCalendarFilter.checked && event.teamCalendar)
    ))
    .sort((a, b) => a.time.localeCompare(b.time));
}

function renderSelectedDay() {
  selectedDayTitle.textContent = formatDate(selectedDate);
  selectedDayEvents.replaceChildren();
  const dayEvents = eventsForDate(selectedDate);

  dayEvents.forEach((event) => {
    const item = document.createElement('li');
    const time = document.createElement('span');
    const title = document.createElement('strong');
    const description = document.createElement('span');
    time.className = 'day-event-time';
    time.textContent = `${formatTime(event.time)}–${formatTime(event.endTime)}`;
    title.className = 'day-event-title';
    title.textContent = event.title;
    description.className = 'day-event-description';
    description.textContent = event.description;
    item.append(time, title, description);
    selectedDayEvents.append(item);
  });

  calendarEmpty.hidden = dayEvents.length !== 0;
}

function renderCalendar() {
  calendarMonthLabel.textContent = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(visibleMonth);
  calendarDays.replaceChildren();
  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - firstDay.getDay());

  for (let offset = 0; offset < 42; offset += 1) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + offset);
    const dateKey = toDateKey(date);
    const dateEvents = eventsForDate(dateKey);
    const dayButton = document.createElement('button');
    const dayNumber = document.createElement('span');
    dayButton.type = 'button';
    dayButton.className = 'calendar-day';
    dayButton.classList.toggle('is-outside', date.getMonth() !== visibleMonth.getMonth());
    dayButton.classList.toggle('is-today', dateKey === toDateKey(today));
    dayButton.classList.toggle('is-selected', dateKey === selectedDate);
    const eventLabel = dateEvents.length
      ? `, ${dateEvents.length} event${dateEvents.length === 1 ? '' : 's'}: ${dateEvents.map((event) => event.title).join(', ')}`
      : '';
    dayButton.setAttribute('aria-label', `${formatDate(dateKey)}${eventLabel}`);
    dayButton.setAttribute('aria-pressed', String(dateKey === selectedDate));
    dayButton.dataset.date = dateKey;
    if (dateEvents.length > 0) {
      dayButton.dataset.eventDensity = dateEvents.length >= 3 ? 'many' : String(dateEvents.length);
    }
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = String(date.getDate());
    dayButton.append(dayNumber);

    if (dateEvents.length > 0) {
      const eventTitles = document.createElement('span');
      eventTitles.className = 'calendar-event-titles';
      dateEvents.slice(0, 3).forEach((calendarEvent) => {
        const eventTitle = document.createElement('span');
        eventTitle.className = 'calendar-event-title';
        eventTitle.textContent = calendarEvent.title;
        eventTitle.title = calendarEvent.title;
        eventTitles.append(eventTitle);
      });
      dayButton.append(eventTitles);

      if (dateEvents.length > 3) {
        const moreEvents = document.createElement('span');
        moreEvents.className = 'calendar-event-more';
        moreEvents.textContent = `${dateEvents.length - 3} more events`;
        dayButton.append(moreEvents);
      }
    }

    calendarDays.append(dayButton);
  }

  renderSelectedDay();
  renderEventSections();
}

function navigateToCalendarDate(dateKey) {
  selectedDate = dateKey;
  const [year, month] = selectedDate.split('-').map(Number);
  visibleMonth = new Date(year, month - 1, 1);
  mainCalendarFilter.checked = true;
  renderCalendar();
  calendarSection.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start'
  });
  Array.from(calendarDays.querySelectorAll('[data-date]'))
    .find((day) => day.dataset.date === dateKey)
    ?.focus({ preventScroll: true });
}

function handleEventCardClick(event) {
  const card = event.target.closest('[data-calendar-date]');
  if (!card) return;
  event.preventDefault();
  navigateToCalendarDate(card.dataset.calendarDate);
}

upcomingEventsList.addEventListener('click', handleEventCardClick);
recentHighlightsList.addEventListener('click', handleEventCardClick);

mainCalendarFilter.addEventListener('change', renderCalendar);
teamCalendarFilter.addEventListener('change', renderCalendar);

document.querySelector('#calendar-prev').addEventListener('click', () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  renderCalendar();
});

document.querySelector('#calendar-next').addEventListener('click', () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  renderCalendar();
});

calendarDays.addEventListener('click', (event) => {
  const dayButton = event.target.closest('[data-date]');
  if (!dayButton) return;
  selectedDate = dayButton.dataset.date;
  const [year, month] = selectedDate.split('-').map(Number);
  visibleMonth = new Date(year, month - 1, 1);
  renderCalendar();
});

async function loadEvents() {
  try {
    const response = await fetch('./events.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}.`);

    const parsedEvents = await response.json();
    if (!Array.isArray(parsedEvents) || parsedEvents.some((event) =>
      !event || typeof event.id !== 'string' ||
      typeof event.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(event.date) ||
      typeof event.time !== 'string' || !/^\d{2}:\d{2}$/.test(event.time) ||
      typeof event.endTime !== 'string' || !/^\d{2}:\d{2}$/.test(event.endTime) ||
      typeof event.title !== 'string' || typeof event.description !== 'string' ||
      typeof event.mainEvents !== 'boolean' || typeof event.teamCalendar !== 'boolean' ||
      (event.recurrence !== null && (
        !event.recurrence || !Number.isInteger(event.recurrence.interval) ||
        event.recurrence.interval < 1 || event.recurrence.interval > 365 ||
        !['day', 'week', 'month'].includes(event.recurrence.unit) ||
        typeof event.recurrence.until !== 'string' || event.recurrence.until <= event.date
      ))
    )) {
      throw new Error('The events file has an invalid format.');
    }

    events = parsedEvents;
    renderCalendar();
    setCalendarMessage('Events are shared from the GitHub events file.');
  } catch (error) {
    setCalendarMessage(`Could not load shared calendar events: ${error.message}`);
  }
}

renderCalendar();
loadEvents();
