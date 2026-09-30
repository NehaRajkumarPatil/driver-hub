import { useEffect, useState } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { api, getApiErrorMessage, type ApiNotification } from '../api/client'

export const NotificationsBell = () => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [error, setError] = useState('')
  const unread = notifications.filter((notification) => !notification.isRead).length

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get<{ data: { notifications: ApiNotification[] } }>('/notifications')
      setNotifications(response.data.data.notifications)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const markRead = async (id: string) => {
    try {
      const response = await api.patch<{ data: { notification: ApiNotification } }>(`/notifications/${id}/read`)
      setNotifications((current) => current.map((item) => item.id === id ? response.data.data.notification : item))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    }
  }

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    }
  }

  return <div className="notification-wrap">
    <button className="icon-button notification-button" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => { setOpen((current) => !current); if (!open) void refresh() }}><Bell size={19} />{unread > 0 && <i />}</button>
    {open && <section className="notification-popover" aria-label="Notifications">
      <div className="notification-popover-heading"><strong>Notifications</strong>{unread > 0 && <button onClick={() => void markAllRead()}>Mark all read</button>}</div>
      {error && <div className="api-error"><span>{error}</span><button className="icon-button" aria-label="Dismiss notification error" onClick={() => setError('')}><X size={15} /></button></div>}
      {loading ? <div className="state-panel loading-state compact-state" role="status"><span className="loading-spinner" />Loading notifications…</div> : notifications.length === 0 ? <div className="state-panel empty-state compact-state"><Bell size={18} /><strong>You’re all caught up</strong><span>Application and job updates will appear here.</span></div> : <div className="notification-items">{notifications.map((item) => <button className={`notification-item ${item.isRead ? '' : 'unread'}`} key={item.id} onClick={() => void markRead(item.id)}><span className="notification-dot" /><span><strong>{item.title}</strong><small>{item.message}</small><small>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></span>{item.isRead && <Check size={13} />}</button>)}</div>}
    </section>}
  </div>
}