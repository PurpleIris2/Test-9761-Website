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
const calendarCodeDialog = document.querySelector('#calendar-code-dialog');
const calendarEventDialog = document.querySelector('#calendar-event-dialog');
const calendarRemoveDialog = document.querySelector('#calendar-remove-dialog');
const calendarEventForm = document.querySelector('#calendar-event-form');
const calendarEventPicker = document.querySelector('#calendar-event-picker');
const calendarRemovePicker = document.querySelector('#calendar-remove-picker');
const eventDateInput = document.querySelector('#calendar-event-date');
const eventTitleInput = document.querySelector('#calendar-event-title-input');
const eventTimeInput = document.querySelector('#calendar-event-time');
const eventEndTimeInput = document.querySelector('#calendar-event-end-time');
const eventTimeError = document.querySelector('#calendar-event-time-error');
const eventRepeatInput = document.querySelector('#calendar-event-repeat');
const repeatOptions = document.querySelector('#calendar-repeat-options');
const repeatIntervalInput = document.querySelector('#calendar-repeat-interval');
const repeatUnitInput = document.querySelector('#calendar-repeat-unit');
const repeatUntilInput = document.querySelector('#calendar-repeat-until');
const repeatError = document.querySelector('#calendar-event-repeat-error');
const eventDescriptionInput = document.querySelector('#calendar-event-description');
const eventMainCalendarInput = document.querySelector('#calendar-event-main');
const eventTeamCalendarInput = document.querySelector('#calendar-event-team');
const eventCategoryError = document.querySelector('#calendar-event-category-error');
const mainCalendarFilter = document.querySelector('#calendar-filter-main');
const teamCalendarFilter = document.querySelector('#calendar-filter-team');
const eventsStorageKey = 'deadalus-team-events-v1';
const today = new Date();
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = toDateKey(today);
let isCalendarUnlocked = false;
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

function storeEvents(updatedEvents) {
  try {
    localStorage.setItem(eventsStorageKey, JSON.stringify(updatedEvents));
  } catch (error) {
    setCalendarMessage(`Could not save calendar changes in this browser: ${error.message}`);
    return false;
  }

  events = updatedEvents;
  renderCalendar();
  setCalendarMessage('Calendar changes saved in this browser.');
  return true;
}

function eventOptionText(event) {
  const repeatLabel = event.recurrence ? ` · repeats every ${event.recurrence.interval} ${event.recurrence.unit}(s)` : '';
  return `${formatDate(event.date, { month: 'short', day: 'numeric', year: 'numeric' })} · ${event.title} · ${event.time}–${event.endTime}${repeatLabel}`;
}

function defaultEndTime(startTime) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const endHours = hours + Math.floor((minutes + 60) / 60);
  if (endHours > 23) return '23:59';
  return `${String(endHours).padStart(2, '0')}:${String((minutes + 60) % 60).padStart(2, '0')}`;
}

function updateEventTimeValidity() {
  const invalidEndTime = eventTimeInput.value && eventEndTimeInput.value && eventEndTimeInput.value <= eventTimeInput.value;
  const message = invalidEndTime ? 'End time must be after the start time.' : '';
  eventEndTimeInput.setCustomValidity(message);
  eventTimeError.textContent = message;
}

function populateEventPicker(picker) {
  picker.replaceChildren();
  events.slice().sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).forEach((event) => {
    const option = document.createElement('option');
    option.value = event.id;
    option.textContent = eventOptionText(event);
    picker.append(option);
  });
}

function closeDialogFromButton(event) {
  const dialog = event.currentTarget.closest('dialog');
  if (dialog) dialog.close();
}

try {
  const savedEvents = localStorage.getItem(eventsStorageKey);
  if (savedEvents) {
    const parsedEvents = JSON.parse(savedEvents);
    if (!Array.isArray(parsedEvents) || parsedEvents.some((event) =>
      !event || typeof event.id !== 'string' || typeof event.date !== 'string' ||
      typeof event.time !== 'string' || typeof event.description !== 'string' ||
      (event.title !== undefined && typeof event.title !== 'string') ||
      (event.endTime !== undefined && typeof event.endTime !== 'string') ||
      (event.mainEvents !== undefined && typeof event.mainEvents !== 'boolean') ||
      (event.teamCalendar !== undefined && typeof event.teamCalendar !== 'boolean') ||
      (event.recurrence !== undefined && event.recurrence !== null && (
        !event.recurrence || !Number.isInteger(event.recurrence.interval) ||
        event.recurrence.interval < 1 || event.recurrence.interval > 365 ||
        !['day', 'week', 'month'].includes(event.recurrence.unit) ||
        typeof event.recurrence.until !== 'string' || event.recurrence.until <= event.date
      ))
    )) {
      throw new Error('Saved calendar data has an invalid format.');
    }
    const needsEventDetailsMigration = parsedEvents.some((event) =>
      typeof event.title !== 'string' || typeof event.endTime !== 'string'
    );
    events = parsedEvents.map((event) => ({
      ...event,
      title: event.title || event.description,
      endTime: event.endTime || defaultEndTime(event.time),
      mainEvents: event.mainEvents ?? true,
      teamCalendar: event.teamCalendar ?? true,
      recurrence: event.recurrence ?? null
    }));
    if (needsEventDetailsMigration) {
      try {
        localStorage.setItem(eventsStorageKey, JSON.stringify(events));
      } catch (error) {
        setCalendarMessage(`Could not save event title and end-time defaults: ${error.message}`);
      }
    }
  }
} catch (error) {
  setCalendarMessage(`Could not load the saved calendar: ${error.message}`);
}

renderCalendar();

function setEventRecurrence(recurrence) {
  eventRepeatInput.checked = Boolean(recurrence);
  repeatOptions.hidden = !eventRepeatInput.checked;
  repeatIntervalInput.required = eventRepeatInput.checked;
  repeatUntilInput.required = eventRepeatInput.checked;
  repeatIntervalInput.value = String(recurrence?.interval ?? 1);
  repeatUnitInput.value = recurrence?.unit ?? 'day';
  repeatUntilInput.value = recurrence?.until ?? '';
}

eventRepeatInput.addEventListener('change', () => {
  setEventRecurrence(eventRepeatInput.checked
    ? { interval: Number(repeatIntervalInput.value) || 1, unit: repeatUnitInput.value, until: repeatUntilInput.value }
    : null);
  repeatError.textContent = '';
});

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
  setCalendarMessage('');
  renderCalendar();
});

document.querySelector('#calendar-edit-toggle').addEventListener('click', (event) => {
  if (isCalendarUnlocked) {
    isCalendarUnlocked = false;
    document.querySelector('#calendar-admin-actions').hidden = true;
    event.currentTarget.textContent = 'EDIT CALENDAR';
    setCalendarMessage('Calendar editing locked.');
    return;
  }

  document.querySelector('#calendar-code').value = '';
  document.querySelector('#calendar-code-error').textContent = '';
  calendarCodeDialog.showModal();
  document.querySelector('#calendar-code').focus();
});

document.querySelector('#calendar-code-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const codeInput = document.querySelector('#calendar-code');
  if (codeInput.value !== '1559') {
    document.querySelector('#calendar-code-error').textContent = 'That code is not correct. Please try again.';
    codeInput.select();
    return;
  }

  isCalendarUnlocked = true;
  document.querySelector('#calendar-admin-actions').hidden = false;
  document.querySelector('#calendar-edit-toggle').textContent = 'LOCK CALENDAR';
  calendarCodeDialog.close();
  setCalendarMessage('Editing is unlocked for this visit.');
});

document.querySelector('#calendar-add').addEventListener('click', () => {
  calendarEventForm.dataset.mode = 'add';
  document.querySelector('#calendar-event-title').textContent = 'Add event';
  document.querySelector('#calendar-event-picker').hidden = true;
  document.querySelector('#calendar-event-picker-label').hidden = true;
  eventDateInput.value = selectedDate;
  eventTitleInput.value = '';
  eventTimeInput.value = '12:00';
  eventEndTimeInput.value = '13:00';
  eventTimeError.textContent = '';
  updateEventTimeValidity();
  setEventRecurrence(null);
  repeatError.textContent = '';
  eventMainCalendarInput.checked = true;
  eventTeamCalendarInput.checked = true;
  eventCategoryError.textContent = '';
  eventDescriptionInput.value = '';
  calendarEventDialog.showModal();
  eventDateInput.focus();
});

document.querySelector('#calendar-edit').addEventListener('click', () => {
  if (!events.length) {
    setCalendarMessage('Add an event before editing one.');
    return;
  }

  calendarEventForm.dataset.mode = 'edit';
  document.querySelector('#calendar-event-title').textContent = 'Edit event';
  calendarEventPicker.hidden = false;
  document.querySelector('#calendar-event-picker-label').hidden = false;
  populateEventPicker(calendarEventPicker);
  const initialEvent = events.find((event) => eventOccursOnDate(event, selectedDate)) || events[0];
  calendarEventPicker.value = initialEvent.id;
  eventDateInput.value = initialEvent.date;
  eventTitleInput.value = initialEvent.title;
  eventTimeInput.value = initialEvent.time;
  eventEndTimeInput.value = initialEvent.endTime;
  eventTimeError.textContent = '';
  updateEventTimeValidity();
  setEventRecurrence(initialEvent.recurrence);
  repeatError.textContent = '';
  eventMainCalendarInput.checked = initialEvent.mainEvents;
  eventTeamCalendarInput.checked = initialEvent.teamCalendar;
  eventCategoryError.textContent = '';
  eventDescriptionInput.value = initialEvent.description;
  calendarEventDialog.showModal();
  calendarEventPicker.focus();
});

calendarEventPicker.addEventListener('change', () => {
  const eventToEdit = events.find((event) => event.id === calendarEventPicker.value);
  if (!eventToEdit) return;
  eventDateInput.value = eventToEdit.date;
  eventTitleInput.value = eventToEdit.title;
  eventTimeInput.value = eventToEdit.time;
  eventEndTimeInput.value = eventToEdit.endTime;
  eventTimeError.textContent = '';
  updateEventTimeValidity();
  setEventRecurrence(eventToEdit.recurrence);
  repeatError.textContent = '';
  eventMainCalendarInput.checked = eventToEdit.mainEvents;
  eventTeamCalendarInput.checked = eventToEdit.teamCalendar;
  eventDescriptionInput.value = eventToEdit.description;
});

calendarEventForm.addEventListener('change', () => {
  eventCategoryError.textContent = '';
});

calendarEventForm.addEventListener('input', () => {
  repeatError.textContent = '';
  updateEventTimeValidity();
});

calendarEventForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!isCalendarUnlocked) return;

  if (!eventMainCalendarInput.checked && !eventTeamCalendarInput.checked) {
    eventCategoryError.textContent = 'Select at least one event calendar.';
    return;
  }
  updateEventTimeValidity();
  if (eventEndTimeInput.value <= eventTimeInput.value) {
    eventEndTimeInput.reportValidity();
    return;
  }

  const recurrence = eventRepeatInput.checked
    ? {
        interval: Number(repeatIntervalInput.value),
        unit: repeatUnitInput.value,
        until: repeatUntilInput.value
      }
    : null;

  if (recurrence && (!Number.isInteger(recurrence.interval) || recurrence.interval < 1 || recurrence.interval > 365)) {
    repeatError.textContent = 'Choose a repeat interval between 1 and 365.';
    return;
  }
  if (recurrence && (!recurrence.until || recurrence.until <= eventDateInput.value)) {
    repeatError.textContent = 'Choose an end date after the event date.';
    return;
  }

  const updatedEvent = {
    id: calendarEventForm.dataset.mode === 'edit' ? calendarEventPicker.value : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: eventDateInput.value,
    title: eventTitleInput.value.trim(),
    time: eventTimeInput.value,
    endTime: eventEndTimeInput.value,
    recurrence,
    mainEvents: eventMainCalendarInput.checked,
    teamCalendar: eventTeamCalendarInput.checked,
    description: eventDescriptionInput.value.trim()
  };

  if (!updatedEvent.date || !updatedEvent.title || !updatedEvent.time || !updatedEvent.endTime || !updatedEvent.description) return;
  const updatedEvents = calendarEventForm.dataset.mode === 'edit'
    ? events.map((savedEvent) => savedEvent.id === updatedEvent.id ? updatedEvent : savedEvent)
    : [...events, updatedEvent];

  if (storeEvents(updatedEvents)) {
    selectedDate = updatedEvent.date;
    const [year, month] = selectedDate.split('-').map(Number);
    visibleMonth = new Date(year, month - 1, 1);
    renderCalendar();
    calendarEventDialog.close();
  }
});

document.querySelector('#calendar-remove').addEventListener('click', () => {
  if (!events.length) {
    setCalendarMessage('There are no events to remove.');
    return;
  }

  populateEventPicker(calendarRemovePicker);
  calendarRemovePicker.value = eventsForDate(selectedDate)[0]?.id || events[0].id;
  calendarRemoveDialog.showModal();
  calendarRemovePicker.focus();
});

document.querySelector('#calendar-remove-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!isCalendarUnlocked) return;

  const selectedEvent = events.find((savedEvent) => savedEvent.id === calendarRemovePicker.value);
  if (!selectedEvent) return;
  const shouldRemove = window.confirm(`Delete "${selectedEvent.description}" on ${formatDate(selectedEvent.date)}?`);
  if (!shouldRemove) return;

  if (storeEvents(events.filter((savedEvent) => savedEvent.id !== selectedEvent.id))) {
    calendarRemoveDialog.close();
  }
});

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', closeDialogFromButton);
});
