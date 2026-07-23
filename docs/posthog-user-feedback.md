# PostHog user feedback setup

After deploying the in-app feedback shortcut, configure PostHog for triage:

1. Confirm **Session replay** is enabled for the project.
2. Optional: add an **event trigger** on the `user_feedback` event so replays
   are reliably captured when users submit feedback.
3. Create saved Activity views:
   - All feedback: event name equals `user_feedback`
   - Bugs only: event name equals `user_feedback` and property `is_bug` is true

Feedback events include `message`, `is_bug`, `route`, `platform`, `session_id`,
and `replay_url` (web) when available.

To read submitted messages, open an event in **Activity** and inspect the
`message` property, or run HogQL:

```sql
SELECT
  timestamp,
  distinct_id,
  properties.message AS message,
  properties.is_bug AS is_bug,
  properties.route AS route
FROM events
WHERE event = 'user_feedback'
ORDER BY timestamp DESC
LIMIT 50
```

Note: session replay masks form inputs, so feedback text appears on the event
properties, not in the recording.
