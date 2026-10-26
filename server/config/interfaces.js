// Central configuration for all external interfaces.
// Each interface can run in 'live' mode (real endpoint/device) or 'simulate'
// mode (built-in synthetic data, works with no network or hardware).
//
// Flip `mode` to 'live' and fill in the endpoint/credentials to connect for real.
// Values can also be overridden via environment variables.

const env = process.env;

export const config = {
  // Pilot 3 site: Post Depot Neunkirchen, Lower Austria
  site: { latitude: 47.7247, longitude: 16.0797, name: 'Neunkirchen, AT' },

  weather: {
    mode: env.WEATHER_MODE || 'live',        // 'live' uses Open-Meteo (no API key needed)
    baseUrl: env.WEATHER_URL || 'https://api.open-meteo.com/v1/forecast',
    pollMs: 15 * 60 * 1000,
  },

  energyMarket: {
    mode: env.ENERGY_MODE || 'live',         // 'live' uses aWATTar DE (EPEX spot, German market)
    provider: env.ENERGY_PROVIDER || 'awattar', // 'awattar' | 'energy-charts'
    awattarUrl: 'https://api.awattar.de/v1/marketdata',
    energyChartsUrl: 'https://api.energy-charts.info/price?bzn=DE-LU',
    pollMs: 5 * 60 * 1000,
  },

  vehicleSchedules: {
    mode: env.SCHEDULES_MODE || 'simulate',  // proprietary fleet/tour-planning IT system
    baseUrl: env.SCHEDULES_URL || 'https://fleet.internal/api/v1',
    apiKey: env.SCHEDULES_API_KEY || '',
    authHeader: env.SCHEDULES_AUTH_HEADER || 'X-API-Key', // or 'Authorization' with 'Bearer <key>'
    pollMs: 60 * 1000,
  },

  ocpp: {
    mode: env.OCPP_MODE || 'live',           // OCPP 1.6J Central System (WebSocket server)
    port: Number(env.OCPP_PORT) || 9000,
    path: '/ocpp',
    heartbeatIntervalSec: 300,
  },

  modbus: {
    mode: env.MODBUS_MODE || 'simulate',     // Modbus TCP client to PV inverter / battery
    host: env.MODBUS_HOST || '10.20.3.55',
    port: Number(env.MODBUS_PORT) || 502,
    unitId: Number(env.MODBUS_UNIT) || 1,
    pollMs: 30 * 1000,
    // Register map (input registers). Addresses & scales are inverter-specific;
    // these follow a common SunSpec-like layout — adjust to your device.
    registers: {
      pvPowerW:        { addr: 40083, words: 2, scale: 1,    signed: false },
      batterySocPct:   { addr: 40200, words: 1, scale: 1,    signed: false },
      batteryPowerW:   { addr: 40201, words: 2, scale: 1,    signed: true  }, // + charge / - discharge
      gridPowerW:      { addr: 40206, words: 2, scale: 1,    signed: true  },
    },
  },

  mqtt: {
    mode: env.MQTT_MODE || 'simulate',       // MQTT client to microgrid controller
    brokerUrl: env.MQTT_URL || 'mqtt://grid.dso.eu:1883',
    username: env.MQTT_USER || '',
    password: env.MQTT_PASS || '',
    topics: (env.MQTT_TOPICS || 'microgrid/+/telemetry,grid/signals/#').split(','),
  },
};
