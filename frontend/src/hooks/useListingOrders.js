import { useCallback, useEffect, useState } from 'react'
import { sellerOrdersApi } from '../api/seller.js'
import { ordersApi } from '../api/orders.js'
import { useAuth } from '../auth/AuthContext.jsx'

/**
 * Sale orders tied to one listing. Sellers see every order on it,
 * buyers see only their own. Shared by the inbox chat header and the
 * floating drawer so both show the same deal pipeline.
 *
 * @param {'car'|'part'} listingType
 * @param {number} listingId
 * @param {'selling'|'buying'} role
 */
export function useListingOrders(listingType, listingId, role) {
  const { isAuthenticated } = useAuth()
  const [orders, setOrders] = useState([])

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !listingType || !listingId) {
      setOrders([])
      return []
    }
    try {
      if (role === 'selling') {
        const params = {
          per_page: 20,
          ...(listingType === 'car' ? { car_id: listingId } : { part_id: listingId }),
        }
        const res = await sellerOrdersApi.incoming(params)
        const rows = res?.data ?? []
        setOrders(rows)
        return rows
      }
      const res = await ordersApi.list({ per_page: 50 })
      const rows = Array.isArray(res?.data) ? res.data : []
      const mine = rows.filter((o) =>
        listingType === 'car'
          ? o.item?.car_id === listingId || o.car_id === listingId
          : o.item?.part_id === listingId || o.part_id === listingId,
      )
      setOrders(mine)
      return mine
    } catch {
      setOrders([])
      return []
    }
  }, [isAuthenticated, listingType, listingId, role])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { orders, refresh }
}
