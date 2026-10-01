import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Landmark,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Star,
  Trash2,
  Wallet as WalletIcon,
  XCircle,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { walletApi } from '../api/wallet.js'
import { TimeAgo } from '../utils/timeAgo.jsx'

const peso = (v) =>
  '₱ ' + Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const card = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 12,
  padding: 20,
}

const CHANNELS = [
  { id: 'gcash', label: 'GCash', hint: '11-digit mobile number' },
  { id: 'maya', label: 'Maya', hint: '11-digit mobile number' },
  { id: 'bank', label: 'Bank Transfer', hint: 'Bank account number' },
]

const STATUS_STYLE = {
  pending: { color: 'var(--color-warning)', bg: 'rgba(234, 179, 8, 0.12)', label: 'Pending Review' },
  approved: { color: 'var(--color-info-text)', bg: 'rgba(59, 130, 246, 0.12)', label: 'Approved — Queued for Payout' },
  rejected: { color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.12)', label: 'Rejected' },
  paid: { color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.12)', label: 'Paid Out' },
  completed: { color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.12)', label: 'Settled' },
}

function ChannelIcon({ channel, size = 18 }) {
  if (channel === 'bank') return <Landmark size={size} />
  if (channel === 'maya') return <Smartphone size={size} />
  if (channel === 'gcash') return <Smartphone size={size} />
  return <Building2 size={size} />
}

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || { color: 'var(--color-text-muted)', bg: 'rgba(148, 163, 184, 0.12)', label: status }
  return (
    <span style={{ fontSize: 11, fontWeight: 800, color: s.color, background: s.bg, borderRadius: 12, padding: '4px 10px', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

const inputStyle = {
  width: '100%',
  background: 'var(--color-surface-inset)',
  border: '1px solid var(--input-border)',
  borderRadius: 8,
  padding: '10px 12px',
  color: 'var(--color-heading)',
  fontSize: 13,
  outline: 'none',
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }

export default function Wallet() {
  const { user, isAuthenticated } = useAuth()
  const isSellerRole = user && ['seller', 'dealer', 'parts_seller', 'admin', 'super_admin'].includes(user.role)
  const [summary, setSummary] = useState(null)
  const [statements, setStatements] = useState([])
  const [stmtMeta, setStmtMeta] = useState(null)
  const [stmtFilter, setStmtFilter] = useState('all')
  const [accounts, setAccounts] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('statements')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  // Add-account form
  const [accForm, setAccForm] = useState({ label: '', channel: 'gcash', account_name: '', account_number: '', bank_name: '' })
  const [accBusy, setAccBusy] = useState(false)
  const [accError, setAccError] = useState('')

  // Withdraw form
  const [wdAccount, setWdAccount] = useState('')
  const [wdAmount, setWdAmount] = useState('')
  const [wdBusy, setWdBusy] = useState(false)
  const [wdError, setWdError] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [sum, stmts, accs, wds] = await Promise.all([
        walletApi.summary(),
        walletApi.statements({ type: stmtFilter, per_page: 20 }),
        walletApi.accounts(),
        walletApi.withdrawals({ per_page: 10 }),
      ])
      setSummary(sum)
      setStatements(stmts?.data ?? [])
      setStmtMeta(stmts?.meta ?? null)
      setAccounts(accs ?? [])
      setWithdrawals(wds?.data ?? [])
      if (!wdAccount && (accs ?? []).length > 0) {
        const def = accs.find((a) => a.is_default) || accs[0]
        setWdAccount(String(def.id))
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load your wallet.')
    } finally {
      setLoading(false)
    }
  }, [stmtFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (isAuthenticated) loadAll() }, [isAuthenticated, loadAll])

  const balance = summary?.balance || {}

  const handleAddAccount = async (e) => {
    e?.preventDefault()
    setAccBusy(true)
    setAccError('')
    try {
      await walletApi.createAccount({
        label: accForm.label.trim() || undefined,
        channel: accForm.channel,
        account_name: accForm.account_name.trim(),
        account_number: accForm.account_number.trim(),
        bank_name: accForm.channel === 'bank' ? accForm.bank_name.trim() || undefined : undefined,
      })
      setAccForm({ label: '', channel: 'gcash', account_name: '', account_number: '', bank_name: '' })
      setNotice('Payout account added.')
      await loadAll()
    } catch (err) {
      setAccError(err?.response?.data?.message || err?.response?.data?.errors?.account_number?.[0] || 'Could not save this payout account.')
    } finally {
      setAccBusy(false)
    }
  }

  const handleSetDefault = async (id) => {
    try {
      await walletApi.updateAccount(id, { is_default: true })
      await loadAll()
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not set default account.')
    }
  }

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Remove this payout account?')) return
    try {
      await walletApi.deleteAccount(id)
      setNotice('Payout account removed.')
      await loadAll()
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not remove this account.')
    }
  }

  const handleWithdraw = async (e) => {
    e?.preventDefault()
    setWdBusy(true)
    setWdError('')
    try {
      await walletApi.withdraw({ payout_account_id: Number(wdAccount), amount: Number(wdAmount) })
      setWdAmount('')
      setNotice('Cash-out requested — pending admin review. Funds are locked until it is paid or rejected.')
      await loadAll()
    } catch (err) {
      setWdError(err?.response?.data?.message || err?.response?.data?.errors?.amount?.[0] || 'Could not submit this cash-out request.')
    } finally {
      setWdBusy(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}>
        <WalletIcon size={40} style={{ color: 'var(--color-text-muted)' }} />
        <h2 style={{ color: 'var(--color-heading)' }}>My Wallet</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>Log in to see your earnings, referral rewards, payout accounts, and cash-outs.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1020, margin: '0 auto', padding: '32px 20px 80px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-heading)', margin: '0 0 4px 0' }}>My Wallet</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>
            Sales earnings, referral rewards, payout accounts, and cash-outs for <strong style={{ color: 'var(--color-text)' }}>@{user?.username}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isSellerRole && (
            <Link to="/seller-analytics" className="btn btn-secondary btn-sm">Sales Analytics</Link>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadAll} disabled={loading}>
            <RefreshCw size={14} /> {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {notice && (
        <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--color-success)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}
      {error && (
        <div style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      {/* Balance hero */}
      <div style={{ ...card, marginBottom: 16, background: 'linear-gradient(135deg, #1c1206 0%, var(--card-bg) 60%)', borderColor: '#d8622c' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available Balance</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--color-accent)' }}>{peso(balance.available)}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Cash-out minimum ₱100.00 · No fees</div>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              ['Total Earned', balance.earned, 'var(--color-success)'],
              ['Locked (Pending)', balance.locked, 'var(--color-warning)'],
              ['Withdrawn Paid', balance.withdrawn_paid, 'var(--color-info-text)'],
            ].map(([label, val, color]) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: 19, fontWeight: 800, color }}>{peso(val)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          ['statements', 'Billing Statements'],
          ['accounts', `Payout Accounts (${accounts.length})`],
          ['withdraw', 'Withdraw'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              fontSize: 13, fontWeight: 700, padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
              border: tab === id ? '1px solid #d8622c' : '1px solid var(--input-border)',
              background: tab === id ? 'rgba(216, 98, 44, 0.15)' : 'transparent',
              color: tab === id ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'statements' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <h3 style={{ color: 'var(--color-heading)', fontSize: 15, margin: 0 }}>Ledger — sales, referrals & commissions in, cash-outs out</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['all', 'All'], ['payouts', 'Sales'], ['withdrawals', 'Cash-outs']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStmtFilter(id)}
                  style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', border: '1px solid var(--input-border)', background: stmtFilter === id ? 'var(--card-border)' : 'transparent', color: stmtFilter === id ? 'var(--color-heading)' : 'var(--color-text-muted)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading statements…</p>
          ) : statements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)', fontSize: 13 }}>
              <WalletIcon size={28} style={{ marginBottom: 8, opacity: 0.6 }} />
              <div>No earnings yet. Sales payouts, agent commissions, and referral rewards will appear here.</div>
              {!isSellerRole && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
                  <Link to="/agent" className="btn btn-secondary btn-sm">Earn as an agent</Link>
                  <Link to="/become-seller" className="btn btn-secondary btn-sm">Become a seller</Link>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {statements.map((row) => (
                <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', borderBottom: '1px solid var(--card-border)' }}>
                  <span style={{ width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', flexShrink: 0, background: row.direction === 'credit' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)', color: row.direction === 'credit' ? 'var(--color-success)' : 'var(--color-info-text)' }}>
                    {row.direction === 'credit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                      {row.detail && <span style={{ fontFamily: 'monospace' }}>{row.detail} · </span>}
                      <TimeAgo value={row.created_at} />
                      {row.item_type && <span> · {row.item_type}</span>}
                    </div>
                  </div>
                  <StatusPill status={row.status} />
                  <div style={{ fontSize: 14, fontWeight: 800, color: row.direction === 'credit' ? 'var(--color-success)' : 'var(--color-heading)', whiteSpace: 'nowrap' }}>
                    {row.direction === 'credit' ? '+' : '−'}{peso(row.amount).slice(0)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {stmtMeta && stmtMeta.total > statements.length && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10 }}>Showing {statements.length} of {stmtMeta.total} entries</div>
          )}
        </div>
      )}

      {tab === 'accounts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          <div style={card}>
            <h3 style={{ color: 'var(--color-heading)', fontSize: 15, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={15} /> Add Payout Account</h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 14px 0' }}>GCash, Maya, or bank — cash-outs are sent here after admin review.</p>
            <form onSubmit={handleAddAccount} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Channel</label>
                <select value={accForm.channel} onChange={(e) => setAccForm({ ...accForm, channel: e.target.value })} style={inputStyle}>
                  {CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Label (optional)</label>
                <input value={accForm.label} onChange={(e) => setAccForm({ ...accForm, label: e.target.value })} placeholder="e.g. Main GCash" maxLength={120} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Account Holder Name</label>
                <input value={accForm.account_name} onChange={(e) => setAccForm({ ...accForm, account_name: e.target.value })} placeholder="Juan Dela Cruz" maxLength={160} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Account / Wallet Number</label>
                <input value={accForm.account_number} onChange={(e) => setAccForm({ ...accForm, account_number: e.target.value })} placeholder={CHANNELS.find((c) => c.id === accForm.channel)?.hint} maxLength={80} required style={inputStyle} />
              </div>
              {accForm.channel === 'bank' && (
                <div>
                  <label style={labelStyle}>Bank Name</label>
                  <input value={accForm.bank_name} onChange={(e) => setAccForm({ ...accForm, bank_name: e.target.value })} placeholder="e.g. BDO Unibank" maxLength={120} style={inputStyle} />
                </div>
              )}
              {accError && <div style={{ fontSize: 12, color: 'var(--color-error)' }}>{accError}</div>}
              <button type="submit" disabled={accBusy} className="btn btn-primary btn-sm">
                {accBusy ? 'Saving…' : 'Save Payout Account'}
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {accounts.length === 0 && (
              <div style={{ ...card, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                No payout accounts yet — add one to enable cash-outs.
              </div>
            )}
            {accounts.map((a) => (
              <div key={a.id} style={{ ...card, borderColor: a.is_default ? '#d8622c' : 'var(--card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(216, 98, 44, 0.12)', color: 'var(--color-accent)', flexShrink: 0 }}>
                    <ChannelIcon channel={a.channel} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-heading)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {a.label || a.channel_label}
                      {a.is_default && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', background: 'rgba(251, 191, 36, 0.12)', borderRadius: 999, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Star size={10} /> DEFAULT
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{a.channel_label}{a.bank_name ? ` · ${a.bank_name}` : ''}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{a.account_name} · <span style={{ fontFamily: 'monospace' }}>{a.masked_number}</span></div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {!a.is_default && (
                      <button type="button" onClick={() => handleSetDefault(a.id)} className="btn btn-secondary btn-sm" title="Set as default cash-out account">
                        Default
                      </button>
                    )}
                    <button type="button" onClick={() => handleDeleteAccount(a.id)} className="btn btn-ghost btn-sm" title="Remove account" style={{ color: 'var(--color-error)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'withdraw' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          <div style={card}>
            <h3 style={{ color: 'var(--color-heading)', fontSize: 15, margin: '0 0 4px 0' }}>Request Cash-out</h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 14px 0' }}>
              Available: <strong style={{ color: 'var(--color-success)' }}>{peso(balance.available)}</strong> · Minimum ₱100.00 · Admin reviews before payout.
            </p>
            {accounts.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-warning)' }}>
                Add a payout account first on the <button type="button" onClick={() => setTab('accounts')} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Payout Accounts</button> tab.
              </div>
            ) : (
              <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Cash-out To</label>
                  <select value={wdAccount} onChange={(e) => setWdAccount(e.target.value)} style={inputStyle}>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {(a.label || a.channel_label)} · {a.masked_number}{a.is_default ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Amount (₱)</label>
                  <input type="number" min="100" step="0.01" value={wdAmount} onChange={(e) => setWdAmount(e.target.value)} placeholder="e.g. 1500.00" required style={inputStyle} />
                </div>
                {wdError && <div style={{ fontSize: 12, color: 'var(--color-error)' }}>{wdError}</div>}
                <button type="submit" disabled={wdBusy || !wdAccount} className="btn btn-primary btn-sm">
                  {wdBusy ? 'Submitting…' : 'Submit Cash-out Request'}
                </button>
              </form>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, fontSize: 12, color: 'var(--color-text-muted)', alignItems: 'flex-start' }}>
              <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Requests lock funds immediately. Rejected requests unlock automatically; paid requests appear in your statements.</span>
            </div>
          </div>

          <div style={card}>
            <h3 style={{ color: 'var(--color-heading)', fontSize: 15, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={15} /> Recent Cash-outs</h3>
            {withdrawals.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No cash-out requests yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {withdrawals.map((w) => (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--card-border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-heading)' }}>{peso(w.net_amount)}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                        {w.payout_account?.label || w.payout_account?.channel} · <TimeAgo value={w.created_at} />
                      </div>
                    </div>
                    <StatusPill status={w.status} />
                  </div>
                ))}
              </div>
            )}
            {isSellerRole && (
              <Link to="/seller-analytics" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', textDecoration: 'none', display: 'inline-block', marginTop: 12 }}>
                View sales analytics →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
