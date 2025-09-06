import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { FiBell, FiCheckCircle, FiCircle, FiRefreshCcw, FiUserPlus, FiCheck } from 'react-icons/fi';
import './ReceiveNotifications.css';

const PAGE_SIZE = 10;
const TYPE_LABEL = {
    friend_request_received: 'Friend request',
    friend_request_accepted: 'Request accepted',
};
const TYPE_ICON = {
    friend_request_received: <FiUserPlus />,
    friend_request_accepted: <FiCheck />,
};
const formatType = (t) =>
  TYPE_LABEL[t] ||
  t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function ReceiveNotifications() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr('');
      const { data } = await axios.get('/api/notifications', {
        params: { page, limit: PAGE_SIZE, unreadOnly }
      });
      setItems(data.items || []);
      setTotal(Number(data.total || 0));
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < pages;

  const markRead = async (id) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`);
      setItems(prev =>
        prev.map(n => n.notification_id === id
          ? { ...n, is_read: 1, read_at: new Date().toISOString() }
          : n
        )
      );
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || 'Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    try {
      await axios.patch(`/api/notifications/read-all`);
      setItems(prev => prev.map(n => ({ ...n, is_read: 1, read_at: n.read_at || new Date().toISOString() })));
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || 'Failed to mark all as read');
    }
  };

  const markUnread = async (id) => {
    try {
      await axios.patch(`/api/notifications/${id}/unread`);
      setItems(prev =>
        prev.map(n =>
          n.notification_id === id ? { ...n, is_read: 0, read_at: null } : n
        )
      );
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || 'Failed to mark as unread');
    }
  };
  
  const markAllUnread = async () => {
    try {
      await axios.patch(`/api/notifications/unread-all`);
      setItems(prev => prev.map(n => ({ ...n, is_read: 0, read_at: null })));
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || 'Failed to mark all as unread');
    }
  };
  

  return (
    <div className="notifications">
      {/* Header */}
      <div className="notifications-header">
        <h2><FiBell /> Notifications</h2>
      </div>

{/* Toolbar */}
<div className="notifications-toolbar">
  <div className="left">
    <button
      className={`chip ${!unreadOnly ? 'active' : ''}`}
      onClick={() => { setUnreadOnly(false); setPage(1); }}
      disabled={loading}
    >
      All
    </button>
    <button
      className={`chip ${unreadOnly ? 'active' : ''}`}
      onClick={() => { setUnreadOnly(true); setPage(1); }}
      disabled={loading}
    >
      Unread
    </button>
  </div>

  <div className="right">
    <button className="primary-btn" onClick={markAllRead} disabled={loading}>
      <FiCheckCircle /> Mark all read
    </button>
    <button className="primary-btn" onClick={markAllUnread} disabled={loading}>
    <FiCircle /> Mark all unread
    </button>
    <button className="primary-btn" onClick={load} disabled={loading}>
      <FiRefreshCcw /> Refresh
    </button>
  </div>
</div>

      {/* Errors */}
      {err && <div className="notif-error">{err}</div>}

      {/* Card */}
      <div className="inbox-card">
        {loading && <div className="loader">Loading…</div>}

        {!loading && items.length === 0 && !err && (
            <div className="empty">No notifications yet</div>
        )}

        {!loading && items.length > 0 && (
        <>
            <ul className="notif-list">
            {items.map(n => {
                const actorName = [n.actor_firstName, n.actor_lastName].filter(Boolean).join(' ') || 'a student';
                const friendlyTitle =
                n.type === 'friend_request_received'
                    ? `You received a new friend request from ${actorName}`
                    : n.type === 'friend_request_accepted'
                    ? `${actorName} accepted your friend request`
                    : (friendlyTitle || friendlyMessage || '');
                const friendlyMessage =
                n.type === 'friend_request_accepted'
                    ? 'Look, you have got a new friend!'
                    : n.type === 'friend_request_received'
                    ? 'This user wants to add you as friend!'
                    : (n.message || '');
                return (
                <li key={n.notification_id} className={`notif-card ${!n.is_read ? 'is-unread' : ''}`}>
                    <div className="notif-left">
                    <span className="dot"> <FiBell /> </span>
                    </div>
                    <div className="notif-main">
                    <div className="notif-top">
                        <span className={`type ${n.type}`}>
                        {{
                            friend_request_received: 'Friend request',
                            friend_request_accepted: 'Request accepted'
                        }[n.type] ?? n.type.replace(/_/g, ' ')}
                        </span>
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                    </div>

                    <div className="title">{friendlyTitle}</div>
                    <p className="message">{friendlyMessage}</p>

                    {!n.is_read && (
                        <div className="notif-actions">
                        <button className="mark-read" onClick={() => markRead(n.notification_id)}>
                            Mark read
                        </button>
                        </div>
                    )}
                    </div>
                </li>
                );
            })}
            </ul>
        </>
        )}

        {/* Pagination */}
        <div className="pagination">
            <button
            className="page-btn"
            disabled={!canPrev || loading}
            onClick={() => { if (canPrev) setPage(p => p - 1); }}
            >
            ‹
            </button>
            <span className="page-info">{page} / {pages}</span>
            <button
            className="page-btn"
            disabled={!canNext || loading}
            onClick={() => { if (canNext) setPage(p => p + 1); }}
            >
            ›
            </button>
        </div>
      </div>
    </div>
  );
}
