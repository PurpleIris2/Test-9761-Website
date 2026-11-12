# Updating the shared calendar

Calendar events are stored in [`events.json`](./events.json). To add, edit, or remove events, edit that file on GitHub and commit the change (or merge a pull request). Once the updated site is deployed, all visitors will see the same events.

Each event uses this format:

```json
{
  "id": "unique-event-id",
  "date": "2026-12-01",
  "title": "Team meeting",
  "time": "17:00",
  "endTime": "18:00",
  "description": "Weekly team meeting.",
  "mainEvents": true,
  "teamCalendar": true,
  "recurrence": null
}
```

Dates use `YYYY-MM-DD`; times use 24-hour `HH:MM`. For a repeating event, set `recurrence` to an object with an `interval` from 1 to 365, a `unit` of `day`, `week`, or `month`, and an `until` date later than the event date.
