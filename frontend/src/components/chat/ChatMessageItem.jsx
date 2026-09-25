import { AlertCircle, Check, CheckCheck, Clock, ShieldAlert, ShieldCheck, User } from 'lucide-react'
import ListingContextCard from './ListingContextCard.jsx'

export default function ChatMessageItem({
  message,
  isOwnMessage,
  position = 'single',
  showSenderHeader = true,
  onRetry,
}) {
  if (!message) return null

  const formattedTime = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  const senderUsername = message.sender?.username ? `@${message.sender.username}` : 'Member'
  const isKycVerified = message.sender?.is_kyc_verified

  // Determine delivery status: sending -> sent -> delivered -> seen / read
  let status = message.status
  if (!status) {
    if (message.is_read || message.read_at) {
      status = 'seen'
    } else {
      status = 'sent'
    }
  }

  return (
    <div
      className={`chat-message-item ${
        isOwnMessage ? 'chat-message-item--own' : 'chat-message-item--other'
      } chat-message-item--${position}`}
    >
      {!isOwnMessage && (
        <div
          className={`chat-message-item__avatar ${
            !showSenderHeader && position !== 'last' && position !== 'single'
              ? 'chat-message-item__avatar--spacer'
              : ''
          }`}
        >
          {showSenderHeader || position === 'last' || position === 'single' ? (
            message.sender?.avatar_url ? (
              <img src={message.sender.avatar_url} alt={senderUsername} />
            ) : (
              <div className="chat-message-item__avatar-placeholder">
                <User size={14} />
              </div>
            )
          ) : null}
        </div>
      )}

      <div className="chat-message-item__container">
        {!isOwnMessage && message.sender && showSenderHeader && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <span className="chat-message-item__sender-name">{senderUsername}</span>
            {isKycVerified && (
              <ShieldCheck size={13} style={{ color: '#10b981' }} title="KYC Verified Seller" />
            )}
          </div>
        )}

        {/* Polymorphic Listing Attachment Card */}
        {message.listing && (
          <div className="chat-message-item__listing">
            <ListingContextCard listing={message.listing} compact />
          </div>
        )}

        {/* Message Bubble with Dynamic Position-Aware Border Radius */}
        <div
          className={`chat-message-item__bubble ${
            message.is_redacted ? 'chat-message-item__bubble--redacted' : ''
          } ${status === 'sending' ? 'chat-message-item__bubble--sending' : ''} ${
            status === 'failed' ? 'chat-message-item__bubble--failed' : ''
          }`}
        >
          <p className="chat-message-item__text">{message.body}</p>

          {message.is_redacted && (
            <div className="chat-message-item__safety-flag">
              <ShieldAlert size={13} />
              <span>Safety notice: Contact details masked for safety</span>
            </div>
          )}
        </div>

        {/* Metadata & Real-time Status */}
        <div className="chat-message-item__meta">
          <span className="chat-message-item__time">{formattedTime}</span>

          {isOwnMessage && (
            <span className="chat-message-item__status">
              {status === 'sending' && (
                <span className="chat-message-item__status-sending" title="Sending...">
                  <Clock size={11} className="chat-message-item__spin" />
                  <span className="chat-message-item__status-label">Sending</span>
                </span>
              )}

              {status === 'failed' && (
                <span className="chat-message-item__status-failed" title="Failed to send">
                  <AlertCircle size={12} style={{ color: '#ef4444' }} />
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="chat-message-item__retry-btn"
                    >
                      Retry
                    </button>
                  )}
                </span>
              )}

              {status === 'sent' && (
                <span className="chat-message-item__status-sent" title="Sent">
                  <Check size={13} className="chat-message-item__check" />
                </span>
              )}

              {status === 'delivered' && (
                <span className="chat-message-item__status-delivered" title="Delivered">
                  <CheckCheck size={13} className="chat-message-item__check" />
                </span>
              )}

              {status === 'seen' && (
                <span className="chat-message-item__seen-wrapper" title="Seen">
                  <CheckCheck
                    size={13}
                    className="chat-message-item__check chat-message-item__check--read"
                  />
                  <span className="chat-message-item__seen-text">Seen</span>
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
