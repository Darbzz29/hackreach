# HackReach

A college outreach tracker for hackathon organisers. Track calls to student club coordinators across 600+ Indian colleges, log call outcomes, and see state-wise progress.

## Features
- Dashboard with KPIs, outreach pipeline and state-wise progress (MongoDB aggregation)
- Colleges table with search, state and status filters, pagination
- Per-college panel: edit coordinator details, log calls (embedded documents), call history, message templates
- Call list of colleges due for follow-up (date query)
- CSV import (bulk upsert) and CSV export
- Unique index on college name and state

## Tech stack
Node.js, Express, MongoDB, Mongoose, vanilla JavaScript

## Run it
1. Install Node.js and MongoDB, and start MongoDB locally
2. `npm install`
3. `node server.js`
4. Open http://localhost:3000

Sample data: import `sample-colleges.csv` from the Import CSV page. Phone numbers and emails in it are dummy values.
