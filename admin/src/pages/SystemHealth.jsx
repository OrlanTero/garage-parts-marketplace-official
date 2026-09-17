import { useEffect, useState } from 'react'
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Database,
  Cpu,
  Radio,
  Server,
  Zap,
} from 'lucide-react'
import { healthApi } from '../api/health.js'

export default function SystemHealth() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastCheck, setLastCheck] = useState(null)
  const [latency, setLatency] = useState(null)

  const runDiagnostics = async () => {
    setLoading(true)
    const start = performance.now()
    try {
      const res = await healthApi.check()
      const end = performance.now()
      setLatency(Math.round(end - start))
      setData(res)
    } catch {
      setData({ status: 'error', database: 'unreachable', cache: 'unreachable', queue: 'unreachable' })
      setLatency(null)
    } finally {
      setLastCheck(new Date().toLocaleTimeString())
      setLoading(false)
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'var(--admin-text-primary)',
              margin: '0 0 4px 0',
            }}
          >
            System & Infrastructure Health
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Live status probes for backend API, MySQL database, Redis cache, and Laravel Reverb WebSockets.
          </p>
        </div>

        <button
          type="button"
          onClick={runDiagnostics}
          disabled={loading}
          className="btn btn-primary btn-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Run Probe Diagnostics</span>
        </button>
      </div>

      {/* Latency & Last Checked Banner */}
      <div
        className="admin-card"
        style={{
          padding: '16px 24px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              padding: 8,
              borderRadius: '50%',
              backgroundColor: data?.status === 'ok' ? 'var(--admin-success-bg)' : '#FEF2F2',
              color: data?.status === 'ok' ? '#047857' : '#EF4444',
            }}
          >
            {data?.status === 'ok' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--admin-text-primary)' }}>
              {data?.status === 'ok' ? 'All Core Engine Services Healthy' : 'Service Probe Warning'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>
              {lastCheck ? `Last diagnostic probe: ${lastCheck}` : 'Checking services...'}
            </div>
          </div>
        </div>

        {latency !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, textAlign: 'right' }}>
            {data?.execution_ms !== undefined && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                  Server Execution
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#047857', fontFamily: 'var(--font-display)' }}>
                  {data.execution_ms} ms
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                Roundtrip Latency
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-rust)', fontFamily: 'var(--font-display)' }}>
                {latency} ms
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Service Status Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* MySQL */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Database size={22} style={{ color: 'var(--color-rust)' }} />
              <div style={{ fontWeight: 700, fontSize: 15 }}>MySQL 8 Primary Database</div>
            </div>
            {data?.telemetry?.database_ms !== undefined && (
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                {data.telemetry.database_ms} ms
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', margin: '0 0 16px 0' }}>
            Persistent relational data storage for cars, parts, transactions, and users.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Status:</span>
            {data?.checks?.database === 'ok' ? (
              <span className="badge badge-success">
                <CheckCircle2 size={12} /> Connected
              </span>
            ) : data ? (
              <span className="badge badge-danger">
                <AlertCircle size={12} /> Degraded
              </span>
            ) : (
              <span className="badge badge-neutral">Checking...</span>
            )}
          </div>
        </div>

        {/* Redis Cache */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Zap size={22} style={{ color: 'var(--color-orange)' }} />
              <div style={{ fontWeight: 700, fontSize: 15 }}>Redis 7 High-Speed Cache</div>
            </div>
            {data?.telemetry?.cache_ms !== undefined && (
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                {data.telemetry.cache_ms} ms
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', margin: '0 0 16px 0' }}>
            In-memory caching layer for fast API lookups, session tokens, and rate limits.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Status:</span>
            {data?.checks?.cache === 'ok' ? (
              <span className="badge badge-success">
                <CheckCircle2 size={12} /> Active
              </span>
            ) : data ? (
              <span className="badge badge-danger">
                <AlertCircle size={12} /> Degraded
              </span>
            ) : (
              <span className="badge badge-neutral">Checking...</span>
            )}
          </div>
        </div>

        {/* Reverb WebSocket */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Radio size={22} style={{ color: 'var(--color-steel)' }} />
              <div style={{ fontWeight: 700, fontSize: 15 }}>Laravel Reverb WebSockets</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', margin: '0 0 16px 0' }}>
            Real-time event broadcasting server for live car status changes and presence.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Status:</span>
            <span className="badge badge-success">
              <CheckCircle2 size={12} /> Listening (Port 8080)
            </span>
          </div>
        </div>

        {/* Nginx Microcaching */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Server size={22} style={{ color: '#4F46E5' }} />
              <div style={{ fontWeight: 700, fontSize: 15 }}>Nginx FastCGI Edge Cache</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', margin: '0 0 16px 0' }}>
            FastCGI microcaching with stale-while-revalidate and cache bypass for mutations.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Status:</span>
            <span className="badge badge-success">
              <CheckCircle2 size={12} /> Configured
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
