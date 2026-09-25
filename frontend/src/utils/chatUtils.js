/**
 * Compute the grouping position and header visibility for a message
 * in a conversation thread based on consecutive messages from the same sender.
 *
 * @param {Array} messages - List of conversation messages
 * @param {number} idx - Current message index
 * @returns {{ position: 'single' | 'first' | 'middle' | 'last', showSenderHeader: boolean, isSameSenderAsPrev: boolean, isSameSenderAsNext: boolean }}
 */
export function getMessagePositionInfo(messages, idx) {
  if (!messages || idx < 0 || idx >= messages.length) {
    return {
      position: 'single',
      showSenderHeader: true,
      isSameSenderAsPrev: false,
      isSameSenderAsNext: false,
    }
  }

  const currentMsg = messages[idx]
  const prevMsg = idx > 0 ? messages[idx - 1] : null
  const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null

  // Check same sender sequence
  const isSameSenderAsPrev = !!(prevMsg && prevMsg.sender_id === currentMsg.sender_id)
  const isSameSenderAsNext = !!(nextMsg && nextMsg.sender_id === currentMsg.sender_id)

  let position = 'single'
  if (!isSameSenderAsPrev && !isSameSenderAsNext) {
    position = 'single'
  } else if (!isSameSenderAsPrev && isSameSenderAsNext) {
    position = 'first'
  } else if (isSameSenderAsPrev && isSameSenderAsNext) {
    position = 'middle'
  } else if (isSameSenderAsPrev && !isSameSenderAsNext) {
    position = 'last'
  }

  return {
    position,
    showSenderHeader: !isSameSenderAsPrev,
    isSameSenderAsPrev,
    isSameSenderAsNext,
  }
}
