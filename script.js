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
const calendarMessage = document.querySelector('#calendar-message');
const calendarCodeDialog = document.querySelector('#calendar-code-dialog');
const calendarEventDialog = document.querySelector('#calendar-event-dialog');
const calendarRemoveDialog = document.querySelector('#calendar-remove-dialog');
const calendarEventForm = document.querySelector('#calendar-event-form');
const calendarEventPicker = document.querySelector('#calendar-event-picker');
const calendarRemovePicker = document.querySelector('#calendar-remove-picker');
const eventDateInput = document.querySelector('#calendar-event-date');
const eventTimeInput = document.querySelector('#calendar-event-time');
const eventDescriptionInput = document.querySelector('#calendar-event-description');
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

function eventsForDate(dateKey) {
  return events.filter((event) => event.date === dateKey).sort((a, b) => a.time.localeCompare(b.time));
}

function renderSelectedDay() {
  selectedDayTitle.textContent = formatDate(selectedDate);
  selectedDayEvents.replaceChildren();
  const dayEvents = eventsForDate(selectedDate);

  dayEvents.forEach((event) => {
    const item = document.createElement('li');
    const time = document.createElement('time');
    const description = document.createElement('span');
    time.dateTime = event.time;
    time.textContent = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
      new Date(`2000-01-01T${event.time}:00`)
    );
    description.textContent = event.description;
    item.append(time, description);
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
    dayButton.setAttribute('aria-label', `${formatDate(dateKey)}${dateEvents.length ? `, ${dateEvents.length} event${dateEvents.length === 1 ? '' : 's'}` : ''}`);
    dayButton.setAttribute('aria-pressed', String(dateKey === selectedDate));
    dayButton.dataset.date = dateKey;
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = String(date.getDate());
    dayButton.append(dayNumber);

    if (dateEvents.length > 0) {
      const eventCount = document.createElement('span');
      eventCount.className = 'calendar-event-dots';
      eventCount.textContent = `${dateEvents.length} event${dateEvents.length === 1 ? '' : 's'}`;
      dayButton.append(eventCount);
    }

    calendarDays.append(dayButton);
  }

  renderSelectedDay();
}

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
  return `${formatDate(event.date, { month: 'short', day: 'numeric', year: 'numeric' })} · ${event.time} · ${event.description}`;
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
      typeof event.time !== 'string' || typeof event.description !== 'string'
    )) {
      throw new Error('Saved calendar data has an invalid format.');
    }
    events = parsedEvents;
  }
} catch (error) {
  setCalendarMessage(`Could not load the saved calendar: ${error.message}`);
}

renderCalendar();

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
  eventTimeInput.value = '12:00';
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
  const initialEvent = events.find((event) => event.date === selectedDate) || events[0];
  calendarEventPicker.value = initialEvent.id;
  eventDateInput.value = initialEvent.date;
  eventTimeInput.value = initialEvent.time;
  eventDescriptionInput.value = initialEvent.description;
  calendarEventDialog.showModal();
  calendarEventPicker.focus();
});

calendarEventPicker.addEventListener('change', () => {
  const eventToEdit = events.find((event) => event.id === calendarEventPicker.value);
  if (!eventToEdit) return;
  eventDateInput.value = eventToEdit.date;
  eventTimeInput.value = eventToEdit.time;
  eventDescriptionInput.value = eventToEdit.description;
});

calendarEventForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!isCalendarUnlocked) return;

  const updatedEvent = {
    id: calendarEventForm.dataset.mode === 'edit' ? calendarEventPicker.value : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: eventDateInput.value,
    time: eventTimeInput.value,
    description: eventDescriptionInput.value.trim()
  };

  if (!updatedEvent.date || !updatedEvent.time || !updatedEvent.description) return;
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
