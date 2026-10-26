# PrivacyGuard-Fleet — Edge Gateway Console

A full-stack administration console for the PrivacyGuard-Fleet edge gateway.

- **Backend:** Node.js + Express REST API. Runs the real anonymisation logic
  (pseudonymisation, differential-privacy noise injection, generalisation),
  serves gateway configuration, data sources, model computation and logs.
- **Frontend:** React (Vite). Dashboard, Data, Anonymisation, Model, Gateway
  and Logs pages, all driven by the backend API.

## Project structure

```
privacyguard-edge-gateway/
├── package.json          # root scripts (run both apps together)
├── server/               # Node.js + Express backend
│   ├── index.js          # server entry point
│   ├── routes/api.js     # REST API endpoints
│   ├── services/         # anonymisation logic
│   └── data/             # in-memory store + synthetic data generators
└── client/               # React + Vite frontend
    └── src/
        ├── App.jsx
        ├── api.js        # fetch wrapper for the backend
        ├── components/   # Sidebar, Topbar, shared UI
        └── pages/        # Dashboard, Data, Anonymisation, Model, Gateway, Logs
```

## Prerequisites

- Node.js 18 or newer (tested on Node 22)
- npm

## Setup

From the project root, install all dependencies (root, server and client):

```bash
npm run install:all
```

## Run in development

Starts the backend (port 4000) and the Vite dev server (port 5173) together,
with hot-reload. The Vite dev server proxies `/api` calls to the backend.

```bash
npm run dev
```

Then open **http://localhost:5173**.

You can also run them separately:

```bash
npm --prefix server run dev     # backend on :4000
npm --prefix client run dev     # frontend on :5173
```

## Run in production

Build the React app and let the Node server serve it as static files:

```bash
npm run build        # builds client into client/dist
npm start            # serves API + client on http://localhost:4000
```

Then open **http://localhost:4000**.

## API overview

| Method | Endpoint                     | Description                              |
|--------|------------------------------|------------------------------------------|
| GET    | `/api/health`                | Health check                             |
| GET    | `/api/dashboard`             | Live system metrics, health, alerts, flow|
| GET    | `/api/gateway/config`        | Gateway configuration                    |
| PUT    | `/api/gateway/config`        | Update gateway configuration             |
| GET    | `/api/gateway/connections`   | External data connections                |
| GET    | `/api/gateway/users`         | User list                                |
| GET    | `/api/data`                  | List of data sources                     |
| GET    | `/api/data/:id`              | Rows for one data source                 |
| GET    | `/api/anonymise/levels`      | Available anonymisation levels           |
| POST   | `/api/anonymise/estimate`    | Privacy/utility estimate                 |
| POST   | `/api/anonymise/run`         | Anonymise a batch (raw + anonymised out) |
| GET    | `/api/models`                | Computed models                          |
| GET    | `/api/models/:id`            | Model + detail results                   |
| POST   | `/api/models/compute`        | Compute a new model                      |
| GET    | `/api/logs?severity=&q=`     | Filtered logs                            |

## Notes

- Data is generated in-memory for demonstration. To connect real device feeds
  (OCPP, Modbus, MQTT, REST) and a persistent database, replace the generators
  in `server/data/store.js` and the anonymisation input in
  `server/services/anonymise.js`.
- The anonymisation logic in `server/services/anonymise.js` is real: SHA-256
  pseudonymisation, Gaussian-noise differential privacy scaled by epsilon, and
  configurable geo/time generalisation.
- Icons load from the Tabler Icons CDN; an internet connection is needed on
  first load, or self-host the font for offline use.

## Interfaces (real protocol adapters)

All six data sources are backed by real protocol adapters in `server/interfaces/`.
Each runs in `live` or `simulate` mode; **simulate works with no network or
hardware**, so the app runs out of the box. Configure them in
`server/config/interfaces.js` (or via environment variables) and switch to `live`.

| Source            | Protocol   | Live target                                    | Adapter                         |
|-------------------|------------|------------------------------------------------|---------------------------------|
| Weather           | REST       | Open-Meteo (key-less)                          | `interfaces/weather.js`         |
| Energy market     | REST       | aWATTar DE / Energy-Charts (German spot price) | `interfaces/energyMarket.js`    |
| Vehicle schedules | REST       | Proprietary fleet/tour-planning system         | `interfaces/vehicleSchedules.js`|
| Charging tables   | OCPP 1.6J  | EV charge controllers (WebSocket CSMS)         | `interfaces/ocpp.js`            |
| PV / battery      | Modbus TCP | PV inverter / battery storage                  | `interfaces/modbus.js`          |
| Grid signals      | MQTT       | Microgrid controller / DSO broker              | `interfaces/mqtt.js`            |

### Switching an interface to live

Set the mode (and any endpoint/credentials) via env vars, e.g.:

```bash
# Weather + energy already default to live (public, key-less APIs)
WEATHER_MODE=live ENERGY_MODE=live npm --prefix server run dev

# Modbus PV inverter
MODBUS_MODE=live MODBUS_HOST=192.168.1.50 MODBUS_PORT=502 npm --prefix server run dev

# MQTT microgrid
MQTT_MODE=live MQTT_URL=mqtt://broker.local:1883 MQTT_USER=edge MQTT_PASS=secret npm --prefix server run dev

# Proprietary vehicle schedules
SCHEDULES_MODE=live SCHEDULES_URL=https://fleet.example/api/v1 SCHEDULES_API_KEY=xxxxx npm --prefix server run dev
```

### OCPP 1.6 charge points

The OCPP adapter starts a **Central System (CSMS)** WebSocket server on
`ws://<host>:9000/ocpp/<chargePointId>` (subprotocol `ocpp1.6`). Point your
charge controllers at that URL. Implemented actions: BootNotification, Heartbeat,
StatusNotification, Authorize, StartTransaction, MeterValues, StopTransaction,
DataTransfer.

### Modbus register map

`server/config/interfaces.js` contains a SunSpec-like input-register map
(PV power, battery SOC, battery power, grid power). Register addresses, word
counts, scaling and sign are device-specific — adjust them to your inverter.

